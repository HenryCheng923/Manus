declare module 'node-apng' {
  interface FrameDelay {
    numerator: number;
    denominator: number;
  }
  function apng(
    frames: Buffer[],
    getDelay: (index: number) => FrameDelay,
  ): Buffer;
  export default apng;
}
