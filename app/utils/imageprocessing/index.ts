import * as path from 'path';
import Clipper from 'image-clipper';
import tempy from 'tempy';
import canvas from 'canvas';

Clipper.configure('canvas', canvas);

export const crop = (filename: string, x: number, y: number, width: number, height: number) => {
  const targetFilename = tempy.file({ extension: path.extname(filename).replace('.', '') });

  return new Promise<string>((resolve) => {
    Clipper(filename, function () {
      this
        .crop(x, y, width, height)
        .toFile(targetFilename, () => resolve(targetFilename));
    });
  });
}
