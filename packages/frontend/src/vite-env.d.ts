/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module 'vue-circle-flags' {
  import type { DefineComponent } from 'vue';
  
  const CircleFlag: DefineComponent<{
    code: string;
    size?: number | string;
  }>;
  
  export default CircleFlag;
}
