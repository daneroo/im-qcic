# `@daneroo/qcic-docz`

Static site (docz) to publish qcic status. (Docz is now built on gatsby)

## TODO

- Extract Components to package (keep docs here)
- [Compare fonts](http://classic.typetester.org/) - Roboto,Tondo,Ubuntu,
- kWh/d
- Add im-weight, backblaze, CCC, gmvault,
- Summary with top metrics, and reuse data in multiple places

## Usage

### Develop

```bash
npm start  # npx docz dev
```

### Publish

The site is now build on vercel. using the `now-build` target,
which produces the `/public` folder as indicated in `doczrc.js:dest`

```bash
npm run deploy:now
```
