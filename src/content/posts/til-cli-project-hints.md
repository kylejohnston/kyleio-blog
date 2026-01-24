---
title: Add project hints to your terminal
description: All you need is a .project-hint file and a simple zsh function
pubDate: 2026-01-24T22:33:17.000Z
tags:
  - til
draft: false
---

Inspired by [this post from Ashur](https://multiline.co/mment/2026/01/my-blogging-setup/), I created a CLI-based workflow to quickly add, edit, and publish content in a couple of my Astro-based projects. 

Knowing future me, there's a good chance I'll forget to use this workflow in the future. So I asked Claude Code if there's a way to see hints in my terminal when I `cd` to a project directory.

Claude recommended a couple of options, the simplest being a `.project-hint` file.

## How to add project-specific hints
First, I added this snippet to my .zshrc file:
```
# Show project hints when entering directories
  cd() {
    builtin cd "$@" || return
    if [[ -f ".project-hint" ]]; then
      cat ".project-hint"
    fi
  }
```

This function wraps `cd` to look for a file named `.project-hint` in the current directory. If it finds that file, it displays the contents in the terminal. Now, when I `cd` to this project, I automatically see this hint: 

```
✏️ POST ADMIN CLI AVAILABLE!
   npm run admin        - Interactive CLI
   npm run post:create  - create a new post
   npm run post:select  - edit a post
   npm run post:publish - publish a post
```

And when I type `npm run admin` it kicks off a workflow:

```
◆  What would you like to do?
│  ● Create (Create a new draft post)
│  ○ Publish
│  ○ Select
```

I can quickly navigate a few questions with my keyboard. Once I'm done, a fresh draft opens my editor of choice, pre-populated with a title, date, category, and more.
