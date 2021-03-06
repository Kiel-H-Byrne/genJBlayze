import * as fs from "fs";
import canvasPkg from "canvas";
import console from "console";
import { layersOrder, format, rarity } from "./config";

const { createCanvas, loadImage } = canvasPkg;
const canvas = createCanvas(format.width, format.height);
const ctx = canvas.getContext("2d");

if (!process.env.PWD) {
  process.env.PWD = process.cwd();
}

const buildDir = `${process.env.PWD}/public/gallery`;
const metDataFile = '_metadata.json';
const layersDir = `${process.env.PWD}/layers`;

let metadata: any[] = [];
let attributes: any[] = [];
let hash: any[] = [];
let decodedHash: any[] = [];

const addRarity = (_str: string) => {
  let itemRarity;

  rarity.forEach((r) => {
    if (_str.includes(r.key)) {
      itemRarity = r.val;
    }
  });

  return itemRarity;
};

const cleanName = (_str: string) => {
  let name = _str.slice(0, -4);
  rarity.forEach((r) => {
    name = name.replace(r.key, "");
  });
  return name;
};

const getImages = (path: string) => {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      return {
        id: index + 1,
        name: cleanName(i),
        fileName: i,
        rarity: addRarity(i),
      };
    });
};

const layersSetup = (layersOrder: any[]) => {
  const layers = layersOrder.map((layerObj, index) => ({
    id: index,
    name: layerObj.name,
    location: `${layersDir}/${layerObj.name}/`,
    images: getImages(`${layersDir}/${layerObj.name}/`),
    position: { x: 0, y: 0 },
    size: { width: format.width, height: format.height },
    number: layerObj.number
  }));
  return layers;
};

const buildSetup = () => {
  if (fs.existsSync(buildDir)) {
    console.log("CLEARING OUT " + buildDir)
    fs.rmdirSync(buildDir, { recursive: true });
  }
  console.log("CREATING DIR " + buildDir)

  fs.mkdirSync(buildDir);
};

const saveLayer = (_canvas: any, _edition: number) => {
  // console.log("SAVING LAYER " + _edition + '.PNG')
  fs.writeFileSync(`${buildDir}/${_edition}.png`, _canvas.toBuffer("image/png"));
};

const addMetadata = (_edition: number) => {
  let dateTime = Date.now();
  let tempMetadata = {
    hash: hash.join(""),
    decodedHash: decodedHash,
    edition: _edition,
    date: dateTime,
    attributes: attributes,
  };
  metadata.push(tempMetadata);
  attributes = [];
  hash = [];
  decodedHash = [];
};

const addAttributes = (_element: any, _layer: any) => {
  let tempAttr = {
    id: _element.id,
    layer: _layer.name,
    name: _element.name,
    rarity: _element.rarity,
  };
  attributes.push(tempAttr);
  hash.push(_layer.id);
  hash.push(_element.id);
  decodedHash.push({ [_layer.id]: _element.id });
};

const drawLayer = async (_layer: any, _edition: number) => {
  const rand = Math.random();
  let element =
    _layer.images[Math.floor(rand * _layer.number)] ? _layer.images[Math.floor(rand * _layer.number)] : null;
  if (element) {
    addAttributes(element, _layer);
    const image = await loadImage(`${_layer.location}${element.fileName}`);

    ctx.drawImage(
      image,
      _layer.position.x,
      _layer.position.y,
      _layer.size.width,
      _layer.size.height
    );
    saveLayer(canvas, _edition);
  }
};

const createFiles = (editions: number) => {
  const layers = layersSetup(layersOrder);

  for (let i = 1; i <= editions; i++) {
    layers.forEach((layer) => {
      drawLayer(layer, i);
    });
    addMetadata(i);
    console.log("Creating edition " + i);
  }
};

const createMetaData = () => {
  fs.stat(`${buildDir}/${metDataFile}`, (err) => {
    if (err == null || err.code === 'ENOENT') {
      console.log("WRITING METADATA FILE " + metDataFile)
      fs.writeFileSync(`${buildDir}/${metDataFile}`, JSON.stringify(metadata, null, 2));
      // console.log(JSON.stringify(metadata, null, 2))
    } else {
      console.log('Oh no, error: ', err.code);
    }
  });
};

export { buildSetup, createFiles, createMetaData };
