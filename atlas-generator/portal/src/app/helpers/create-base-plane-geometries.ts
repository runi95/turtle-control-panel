import { PlaneGeometry } from "three";

export const createBasePlaneGeometries = () => {
  const pxGeometry = new PlaneGeometry(1, 1);
  pxGeometry.rotateY(Math.PI / 2);
  pxGeometry.translate(0.5, 0, 0);

  const nxGeometry = new PlaneGeometry(1, 1);
  nxGeometry.rotateY(-Math.PI / 2);
  nxGeometry.translate(-0.5, 0, 0);

  const pyGeometry = new PlaneGeometry(1, 1);
  pyGeometry.rotateX(-Math.PI / 2);
  pyGeometry.translate(0, 0.5, 0);

  const nyGeometry = new PlaneGeometry(1, 1);
  nyGeometry.rotateX(Math.PI / 2);
  nyGeometry.translate(0, -0.5, 0);

  const pzGeometry = new PlaneGeometry(1, 1);
  pzGeometry.translate(0, 0, 0.5);

  const nzGeometry = new PlaneGeometry(1, 1);
  nzGeometry.rotateY(Math.PI);
  nzGeometry.translate(0, 0, -0.5);

  const geometriesToInvert = [pxGeometry, nxGeometry, pzGeometry, nzGeometry];
  for (const geometry of geometriesToInvert) {
    for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
      geometry.attributes.uv.array[i + 1] =
        1.0 - geometry.attributes.uv.array[i + 1];
    }
  }

  return [
    pxGeometry,
    nxGeometry,
    pyGeometry,
    nyGeometry,
    pzGeometry,
    nzGeometry,
  ];
};
