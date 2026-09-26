# CareScribe Live browser demo

A dependency-free static demo for browser-based session documentation. It uses the Web Speech API when the browser supports it and otherwise plays a clearly labeled, fictional transcript. Session content is saved only in browser `localStorage`.

This demo is non-diagnostic. It has no connected AWS, EHR, storage, or clinical integration.

## Run locally

Serve this directory over localhost so browser microphone permissions work:

```bash
cd web
python3 -m http.server 8080
```

Open <http://localhost:8080>. Chrome or Edge currently offer the broadest Web Speech API support. Denying microphone access safely switches the demo to sample mode.

You can also use any static file server, for example `npx serve web`.

## Host with AWS Amplify

### Amplify console (manual deploy)

1. Zip the **contents** of `web/` so that `index.html` is at the archive root.
2. In the AWS Amplify console, choose **Create new app** → **Deploy without Git**.
3. Give the app a name, select **Drag and drop**, and upload the zip.
4. Deploy and open the generated HTTPS URL. HTTPS is required for microphone access outside localhost.

### Amplify console (Git-connected)

1. Connect the repository and branch in Amplify Hosting.
2. Set the app root to `web`.
3. Use these build settings (there is no build step):

```yaml
version: 1
frontend:
  phases:
    build:
      commands: []
  artifacts:
    baseDirectory: .
    files:
      - '**/*'
  cache:
    paths: []
```

4. Save and deploy.

No environment variables, AWS credentials, or backend resources are needed. Browser support and user permission determine whether live speech transcription is available.
