declare module '@mapbox/polyline' {
  interface PolylineStatic {
    decode(str: string): [number, number][];
    encode(coordinates: [number, number][]): string;
  }
  
  const polyline: PolylineStatic;
  export default polyline;
}