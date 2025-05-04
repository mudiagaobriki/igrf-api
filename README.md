# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
## Building an APK with EAS

This project is configured to use [EAS Build](https://docs.expo.dev/build/introduction/) for creating Android APK files.

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Log in to your Expo account:
   ```bash
   npx eas login
   ```
   If you don't have an Expo account, you can create one at [expo.dev](https://expo.dev/signup).

### Building an APK

To build an APK for testing:

```bash
npm run build:androidapk
```

This will:
1. Start the EAS build process
2. Build an APK file in the cloud
3. Provide a download link when the build is complete

### Other Build Options

- For internal testing (faster builds):
  ```bash
  npm run build:android
  ```

- For production release:
  ```bash
  npm run build:production
  ```

For more information about EAS Build, visit the [Expo documentation](https://docs.expo.dev/build/setup/).
