# feesys.lol

This repo powers [https://feesys.lol](https://feesys.lol), an obnoxious sarcastic memecoin landing page.

## For ChatGPT Or Another Coding Assistant

The goal is simple: edit this repo, push to `main`, and the website updates automatically.

Most page content lives here:

```text
src/main.jsx
```

Most styling lives here:

```text
src/style.css
```

The mascot image lives here:

```text
src/assets/thesis-mascot.png
```

After making changes, run:

```bash
npm install
npm run build
git add .
git commit -m "Update site"
git push origin main
```

The server checks GitHub once per minute. After a successful push, wait about a minute and refresh:

```text
https://feesys.lol
```

## Deployment Details

Server: `198.71.54.203`

Site user: `drink`

Published folder:

```text
/srv/drink/www/feesys.lol/current
```

Server repo checkout:

```text
/srv/drink/apps/main
```

Deploy helper:

```bash
/srv/drink/bin/add-site.sh main feesys.lol https://github.com/dutchiono/drink-miono-live.git main "npm run build" dist
```

You should not need server access for normal page edits. Only use the server if deployment is broken or the domain changes.

Temporary old URL:

```text
https://drink.miono.live
```

## Changing Domains Later

A new domain can be pointed to the same server later.

DNS must point the new domain at:

```text
198.71.54.203
```

Then root needs to wire nginx and HTTPS for the new domain once. After that, normal edits still happen through GitHub.
