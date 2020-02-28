import * as _ from 'lodash';
import * as path from 'path';
import sharp from 'sharp';
import tempy from 'tempy';

interface ICropOptions {
  outputFormat?: 'preserve' | 'png' | 'jpg';
  outputQuality?: number;
  sharpen?: boolean;
  custom?: (sharp: sharp.Sharp) => sharp.Sharp;
}

export const crop = (filename: string, x: number, y: number, width: number, height: number, options: ICropOptions = {}) => {
  const _options: ICropOptions = _.mergeWith({
    outputFormat: 'preserve',
    outputQuality: 100,
    sharpen: false,
    custom: null,
  }, options);

  let processing = sharp(filename)
    .extract({
      left: x,
      top: y,
      width,
      height,
    });

  if (_options.sharpen) {
    processing = processing.sharpen();
  }

  if (typeof _options.custom === 'function') {
    processing = _options.custom(processing);
  }

  let extension = path.extname(filename).replace('.', '');
  switch (_options.outputFormat) {
    case 'png':
      processing = processing.png();
      extension = 'png';
      break;

    case 'jpg':
      processing = processing.jpeg({ quality: _options.outputQuality });
      extension = 'jpg';
      break;
  }

  const targetFilename = tempy.file({ extension });
  return processing.toFile(targetFilename).then(() => targetFilename);
}
