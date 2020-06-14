# `@daneroo/qcic-site`

Main static site for QCIC

- [Deployed on vercel](https://qcic.n.imetrical.com)

## TODO

- 404 handler (dev and prod)
- `logo.mdx`, `site-icon.png`, `site-image.png`
- Unstable dependencies: If i remove `package-lock.json` this blows up. 8-(

## Usage

### Develop

```bash
npm start
# - or -
gatsby develop
```

### Publish (deploy)

This executes a build on vercel, and publishes the production site:

```bash
npm run deploy:now
```

## Setup

This is a gatsby site using  the Document theme  by [Code Bushi](https://codebushi.com/gatsby-starters-and-themes/).

Now add dependencies:

```bash
npm i -D gatsby gatsby-theme-document
```

- Adjust `gatsby-config`

To override styling, just clone and edit
`node_modules/gatsby-theme-document/src/gatsby-plugin-theme-ui/`
into `./src/gatsby-plugin-theme-ui/`

## References

- [gatsby-theme-document by Code Bushi](https://codebushi.com/gatsby-starters-and-themes/)
