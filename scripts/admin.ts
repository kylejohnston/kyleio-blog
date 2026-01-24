import * as p from '@clack/prompts';
import { execSync, exec } from 'node:child_process';
import { generateSlug, formatDateForFrontmatter } from './lib/utils.js';
import {
  getAllPosts,
  getDrafts,
  getExistingTags,
  createPost,
  publishPost,
  updateTendDate,
  type PostFrontmatter,
} from './lib/posts.js';

async function createCommand() {
  p.intro('Create a new post');

  const title = await p.text({
    message: 'Title:',
    placeholder: 'My awesome post',
    validate: (value) => {
      if (!value.trim()) return 'Title is required';
    },
  });

  if (p.isCancel(title)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  const description = await p.text({
    message: 'Description:',
    placeholder: 'A brief description of the post',
    validate: (value) => {
      if (!value.trim()) return 'Description is required';
    },
  });

  if (p.isCancel(description)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  const existingTags = getExistingTags();
  const tagChoices = existingTags.map((tag) => ({ value: tag, label: tag }));

  const selectedTags = await p.multiselect({
    message: 'Select tags (space to toggle, enter to confirm):',
    options: tagChoices,
    required: false,
  });

  if (p.isCancel(selectedTags)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  const tags = selectedTags as string[];

  const extension = await p.select({
    message: 'File extension:',
    options: [
      { value: '.md', label: '.md (Markdown)' },
      { value: '.mdx', label: '.mdx (MDX - with components)' },
    ],
  });

  if (p.isCancel(extension)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  // Generate slug with prefix based on tags
  let slug = generateSlug(title as string);
  if (tags.includes('til') && !slug.startsWith('til-')) {
    slug = `til-${slug}`;
  } else if (tags.includes('project') && !slug.startsWith('project-')) {
    slug = `project-${slug}`;
  }

  const filename = `${slug}${extension}`;

  const frontmatter: PostFrontmatter = {
    title: title as string,
    description: description as string,
    pubDate: formatDateForFrontmatter(),
    tags,
    draft: true,
  };

  const filepath = createPost(filename, frontmatter);

  p.outro(`Created: ${filepath}`);

  const openInEditor = await p.confirm({
    message: 'Open in VS Code?',
    initialValue: true,
  });

  if (openInEditor && !p.isCancel(openInEditor)) {
    exec(`code "${filepath}"`, (error) => {
      if (error) {
        p.log.warn(`Failed to open editor: ${error.message}`);
      }
    });
    p.log.info('Opening in VS Code...');
  }
}

async function publishCommand() {
  p.intro('Publish a draft');

  const drafts = getDrafts();

  if (drafts.length === 0) {
    p.outro('No drafts found');
    return;
  }

  const selected = await p.select({
    message: 'Select a draft to publish:',
    options: drafts.map((post) => ({
      value: post.filename,
      label: post.frontmatter.title,
      hint: post.filename,
    })),
  });

  if (p.isCancel(selected)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  const post = drafts.find((p) => p.filename === selected)!;

  publishPost(post);

  p.log.success(`Published: ${post.filepath}`);

  const gitCommit = await p.confirm({
    message: 'Create git commit?',
    initialValue: true,
  });

  if (gitCommit && !p.isCancel(gitCommit)) {
    try {
      execSync(`git add "${post.filepath}"`);
      execSync(`git commit -m "content(post): publish ${post.frontmatter.title}"`);
      p.log.success('Git commit created');
    } catch (error) {
      p.log.error('Failed to create git commit');
    }
  }

  p.outro('Done!');
}

async function selectCommand() {
  p.intro('Select a post');

  const allPosts = getAllPosts();

  if (allPosts.length === 0) {
    p.outro('No posts found');
    return;
  }

  // Sort: drafts first, then by pubDate descending
  const sortedPosts = allPosts.sort((a, b) => {
    if (a.frontmatter.draft && !b.frontmatter.draft) return -1;
    if (!a.frontmatter.draft && b.frontmatter.draft) return 1;
    return new Date(b.frontmatter.pubDate).getTime() - new Date(a.frontmatter.pubDate).getTime();
  });

  const selected = await p.select({
    message: 'Select a post:',
    options: sortedPosts.map((post) => ({
      value: post.filename,
      label: `${post.frontmatter.draft ? '[DRAFT] ' : ''}${post.frontmatter.title}`,
      hint: post.filename,
    })),
  });

  if (p.isCancel(selected)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  const post = sortedPosts.find((p) => p.filename === selected)!;

  // If published, offer to update tendDate
  if (!post.frontmatter.draft) {
    const updateTend = await p.confirm({
      message: 'Update tendDate to now?',
      initialValue: false,
    });

    if (updateTend && !p.isCancel(updateTend)) {
      updateTendDate(post);
      p.log.success('Updated tendDate');
    }
  }

  exec(`code "${post.filepath}"`, (error) => {
    if (error) {
      p.log.warn(`Failed to open editor: ${error.message}`);
    }
  });
  p.outro(`Opening: ${post.filename}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'create') {
    await createCommand();
  } else if (command === 'publish') {
    await publishCommand();
  } else if (command === 'select') {
    await selectCommand();
  } else {
    p.intro('Blog Admin');

    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'create', label: 'Create', hint: 'Create a new draft post' },
        { value: 'publish', label: 'Publish', hint: 'Publish a draft' },
        { value: 'select', label: 'Select', hint: 'Open an existing post' },
      ],
    });

    if (p.isCancel(action)) {
      p.cancel('Cancelled');
      process.exit(0);
    }

    if (action === 'create') {
      await createCommand();
    } else if (action === 'publish') {
      await publishCommand();
    } else if (action === 'select') {
      await selectCommand();
    }
  }
}

main().catch(console.error);
