import * as path from 'path';
import Clipper from 'image-clipper';
import tempy from 'tempy';
import canvas from 'canvas';

Clipper.configure('canvas', canvas);

export const crop = (filename: string, x: number, y: number, width: number, height: number, quality = 100, multiplyBy = 1) => {
  const targetFilename = tempy.file({ extension: path.extname(filename).replace('.', '') });

  return new Promise<string>((resolve) => {
    Clipper(filename, function () {
      let options = this
        .crop(x, y, width, height)
        .quality(quality);

      if (multiplyBy !== 1) {
        options.resize(width * multiplyBy, height * multiplyBy);
      }

      options
        .toFile(targetFilename, () => resolve(targetFilename));
    });
  });
}
