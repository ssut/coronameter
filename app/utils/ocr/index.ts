import * as Vision from '@google-cloud/vision';
import mime from 'mime-types';
import Config from '../../config';
import * as fse from 'fs-extra';

export default class OCR {
  private client1: any;
  private client2: any;

  public constructor(
    credentials: typeof Config['Google']['VisionAPI']['Credentials'],
  ) {
    this.client1 = new Vision.v1p4beta1.ImageAnnotatorClient({ credentials });
    this.client2 = new Vision.v1.ImageAnnotatorClient({ credentials });
  }

  private get giftiffClient() {
    return this.client1;
  }

  private get otherClient() {
    return this.client2;
  }

  private getClientByExt(ext = '.jpg') {
    switch (ext.toLowerCase()) {
      case '.gif':
      case '.tiff':
        return this.giftiffClient;

      default:
        return this.otherClient;
    }
  }

  public async execute(filename: string, ext: string) {
    const client = this.getClientByExt(ext);

    switch (client) {
      case this.giftiffClient: {
        const features = [{ type: 'DOCUMENT_TEXT_DETECTION' }];
        const requests = [
          {
            inputConfig: {
              mimeType: mime.lookup(ext.replace('.', '')),
              content: (await fse.readFile(filename)).toString('base64'),
            },
            features,
          }
        ];

        return (await client.batchAnnotateFiles({ requests }))[0].responses[0].responses[0];
      }

      case this.otherClient: {
        return (await client.documentTextDetection({
          image: {
            content: (await fse.readFile(filename)),
          },
        }))[0];
      }

      default:
    }
  }

  public extractBoundingRect(textAnnotation: any) {
    const vertices = textAnnotation?.boundingPoly?.vertices ?? [];
    const boundingRect = { x: -1, y: -1, width: -1, height: - 1 };
    try {
      const x = vertices.map(({ x }) => x);
      const y = vertices.map(({ y }) => y);

      const minX = Math.min(...x);
      const minY = Math.min(...y);
      const maxX = Math.max(...x);
      const maxY = Math.max(...y);

      boundingRect.x = minX;
      boundingRect.y = minY;
      boundingRect.width = maxX - minX;
      boundingRect.height = maxY - minY;
    } catch { }

    return boundingRect;
  }
}


export function createOCRInstance() {
  return new OCR(Config.Google.VisionAPI.Credentials);
}
