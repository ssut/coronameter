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

  private get pnggiftiffClient() {
    return this.client1;
  }

  private get otherClient() {
    return this.client2;
  }

  private getClientByExt(ext = '.jpg') {
    switch (ext.toLowerCase()) {
      case '.png':
      case '.gif':
      case '.tiff':
        return this.pnggiftiffClient;

      default:
        return this.otherClient;
    }
  }

  public async execute(filename: string, ext: string) {
    const client = this.getClientByExt(ext);

    switch (client) {
      case this.pnggiftiffClient: {
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
}


export function createOCRInstance() {
  return new OCR(Config.Google.VisionAPI.Credentials);
}
