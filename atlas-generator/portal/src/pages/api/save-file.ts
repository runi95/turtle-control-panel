import type { NextApiRequest, NextApiResponse } from "next";
import * as fs from "fs";
import { PNG } from "pngjs";

type SaveFileBody = {
  atlas?: any;
  atlasMap?: any;
  sprites?: any;
  spritesMap?: any;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const body: SaveFileBody = req.body;
  if (body.atlas == null) {
    res.status(400).send(`Body is missing required property 'atlas'`);
    return;
  }

  if (body.atlasMap == null) {
    res.status(400).send(`Body is missing required property 'atlasMap'`);
    return;
  }

  if (body.sprites == null) {
    res.status(400).send(`Body is missing required property 'sprites'`);
    return;
  }

  if (body.spritesMap == null) {
    res.status(400).send(`Body is missing required property 'spritesMap'`);
    return;
  }

  // Save atlas
  fs.writeFileSync("../portal/public/atlas", new Uint8Array(body.atlas));

  // Save atlas map
  fs.writeFileSync(
    "../portal/public/atlas.map.json",
    JSON.stringify(body.atlasMap)
  );

  fs.writeFileSync(
    "../portal/public/sprites.map.json",
    JSON.stringify(body.spritesMap)
  );

  const base64Data = body.sprites.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  // Hacky fix to transparency issue:
  const png = new PNG();
  png.parse(buffer, (err, data) => {
    if (err) throw err;

    for (let y = 0; y < data.height; y++) {
      for (let x = 0; x < data.width; x++) {
        const idx = (data.width * y + x) << 2;
        if (data.data[idx + 3] > 50) {
          data.data[idx + 3] = 255;
        } else {
          data.data[idx + 3] = 0;
        }
      }
    }

    data.pack().pipe(fs.createWriteStream("../portal/public/sprites.png"));
    res.status(200).end();
  });

  // Save sprite sheet
  // fs.writeFileSync("../portal/public/sprites.png", buffer, {
  //   encoding: "binary",
  // });
}
