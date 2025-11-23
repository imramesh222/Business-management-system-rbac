/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Add any additional type declarations here

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

// Add this to make sure our custom types are recognized
declare global {
  // Add any global type declarations here
}
