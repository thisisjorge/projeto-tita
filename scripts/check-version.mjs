import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('Use SemVer x.y.z');
if (pkg.version !== lock.version || pkg.version !== lock.packages[''].version)
  throw new Error('Package lock version mismatch');
if (!readFileSync('android/app/build.gradle', 'utf8').includes(`versionName "${pkg.version}"`))
  throw new Error('Android version mismatch');
const ios = [
  ...readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8').matchAll(
    /MARKETING_VERSION = ([^;]+);/g,
  ),
];
if (!ios.length || ios.some((entry) => entry[1] !== pkg.version))
  throw new Error('iOS version mismatch');
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${pkg.version}`)
  throw new Error('Tag must match package version');
console.log(`SemVer ${pkg.version}: package, lock, Android and iOS agree.`);
