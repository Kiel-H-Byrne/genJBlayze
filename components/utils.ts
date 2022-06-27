import { ref } from "firebase/storage"
import { NextApiRequest, NextApiResponse } from "next"
import { fbStorage } from "./db/firebase"

export const getRandomHexColor = () =>
  Math.floor(Math.random() * 16777215)
    .toString(16)
    .toUpperCase()
export const getRandomRGBA = () => {
  const getNum = () => Math.floor(Math.random() * 256)
  const getOpacity = () =>
    (Math.floor(Math.random() * (100 - 50 + 1) + 50) / 100).toPrecision(2) //btwn .5-1
  return `rgba(${getNum()},${getNum()},${getNum()},${getOpacity()})`
}
export const snakeCaseRGB = (color: string): string =>
  color.slice(0, -1).replace(/[(,.]/g, "_")

export const getFileName = (uri: string | undefined) =>
  !uri ? "NOURI" : uri.split("/")[uri.split("/").length - 1].split(".")[0]

export function setRef(imageUri: string) {
  return ref(fbStorage, `/uploads/${getFileName(imageUri)}.png`)
}

export const allowCors =
  (fn: (req: NextApiRequest, res: NextApiResponse) => void) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Allow-Origin", "*")
    // another option
    // res.setHeader('Access-Control-Allow-Origin', req.header.origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS")
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
    )

    if (req.method === "OPTIONS") {
      res.status(200).end()
      return
    }

    return await fn(req, res)
  }

export const isDev = () => process.env.NODE_ENV === "development"