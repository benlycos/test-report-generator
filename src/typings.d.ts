/*
 * Extra typings definitions
 */

// Allow .json files imports
declare module '*.json';

// SystemJS module definition
declare var module: NodeModule;
declare module 'js-untar';
declare module 'pako';
interface NodeModule {
  id: string;
}
