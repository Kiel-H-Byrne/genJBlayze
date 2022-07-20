import {
  Box,
  Image,
  Center,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Img,
  Grid,
  GridItem,
  FormHelperText,
  Progress,
  Divider,
  Text,
} from "@chakra-ui/react"
import { nanoid } from "nanoid"
import { BaseSyntheticEvent, useState } from "react"
import { updateArtworkSet, storeImage } from "./db/firebase"
import { ILayerData, IUploadedImage, IVarietyLeaf } from "./types"

//get length
const BASE_PATH = `/gallery/`
const POST_URI =
  "https://us-central1-shop-mocknstock.cloudfunctions.net/app/get-image-layers"
const IMAGES: string[] = new Array(10)
for (let index = 0; index < IMAGES.length; index++) {
  IMAGES[index] = `${BASE_PATH}${index + 1}.png`
}

function App() {
  const [userArtwork, setUserArtwork] = useState(null)
  // const [imageURI, setImageURI] = useState("")
  const [previewURI, setPreviewURI] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [projectId, setProjectId] = useState("")
  const [uploadStatus, setUploadStatus] = useState("")
  const [artworkLayers, setArtworkLayers] = useState([])
  const [varietyMetadata, setVarietyMetadata] = useState([] as IVarietyLeaf[][])
  const [metadata, setMetaData] = useState({} as ILayerData)
  const [fuzzNum, setFuzzNum] = useState(0)

  const onClickUpload = async () => {
    setUploadStatus("STORING IMAGE...")
    if (userArtwork) {
      const imageUrl = await storeImage(userArtwork)
      setUploadStatus("UPLOADING DOCUMENT....")
      const _id = await updateArtworkSet({ imageUrl })
      const metadata: IUploadedImage = {
        _id,
        imageUrl,
        fuzz: `${fuzzNum}%`,
        numDominantColorsToExtract: 6,
      }
      setProjectId(_id)
      setUploadStatus("GETTING LAYERS....")
      // uri && setImageURI(uri)
      imageUrl && getLayers(metadata)
    } else {
      setErrorMsg("No Image Seleted")
    }
  }

  const onFileInputChange = (e: BaseSyntheticEvent) => {
    setPreviewURI("")
    setUserArtwork(null)
    const file = e.target.files[0]
    setUserArtwork(file)
    const reader = new FileReader()
    reader.onload = (ev) =>
      ev.target?.result && setPreviewURI(ev.target.result as string)
    reader.readAsDataURL(file)
    if (file.size > 1234567) {
      console.warn("BIG FILE!!!", file.size)
    }
  }

  const getLayers = async ({
    _id, // original artwork/source id
    imageUrl,
    fuzz,
    numDominantColorsToExtract,
  }: IUploadedImage) => {
    // post image to url, get response back,
    // response is array of images and metadata
    // Example POST method implementation:
    // Default options are marked with *
    setArtworkLayers([])
    const data: Partial<IUploadedImage> = {
      imageUrl,
      fuzz,
      numDominantColorsToExtract,
      isWhiteTransparent: true,
      // filename
    }

    const response = await fetch(POST_URI, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      // cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: "same-origin", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
      },
      // redirect: "follow", // manual, *follow, error
      // referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
      .then((resp) => {
        if (!resp.ok) {
          return resp.text().then((result) => Promise.reject(new Error(result)))
        }
        setUploadStatus("FETCHING LAYERS....")
        return resp.json()
      })
      .then((data) => data)
      .catch((err) => {
        setErrorMsg("Error Fetching Layers: " + err.message)
        console.error("error", err)
      })

    console.info("::-LAYERS RESPONSE-::")
    console.info(response)
    // setLayerImages(response.urls) // parses JSON response into native JavaScript objects

    // const layerData: ILayerData = response.urls.map(
    //   (url: string, i: number) => ({
    //     hexCode: response.dominantColors[i].hexCode,
    //     _id: nanoid(),
    //     depthNumber: i,
    //     imageUri: url,
    //     rarity: "normal",
    //     colorVariety: 0,
    //   }),
    // )
    /**
     * object with layer information.
     * can change shape to array here
     */
    const layerData: ILayerData = response.urls.reduce(
      (obj: ILayerData, url: string, i: number) => {
        obj[response.dominantColors[i].hexCode] = {
          _id: nanoid(),
          _ogid: response.id,
          _rid: _id,
          depthNumber: i,
          imageUri: url,
          rarity: "normal",
          colorVariety: 0,
          varieties: {
            // "rgba255_255_255_1": {}
          },
        }
        return obj
      },
      {},
    )
    setArtworkLayers(response.urls)
    setMetaData(layerData)
    projectId && (await updateArtworkSet({ _id: projectId, layers: layerData })) // use swr here
  }
  /**
   * sends an array of layer urls to server, receives and returns an array of objects containing metadata about each iteration, the source layer, etc.
   * after randomizing layers, the next step is to randomly assemble each layer to create new images of N size.
   */
  const randomizeLayers = async () => {
    console.log("::-SENDING TO SERVER-::")
    console.log(metadata)
    //convert images but ideally recieve downloadURLs when finished...
    console.log("projectId", projectId && projectId)
    const response = (await fetch(`/api/gen`, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      // cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: "same-origin", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
      },
      // redirect: "follow", // manual, *follow, error
      // referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify(metadata), // body data type must match "Content-Type" header
    })
      .then((resp) => {
        setUploadStatus("RANDOMIZING LAYERS....")
        if (!resp.ok) {
          return resp.text().then((result) => Promise.reject(new Error(result)))
        }
        return resp.json()
      })
      .then((data) => data)
      .catch((err) => {
        setErrorMsg("Error Creating Layers: " + err)
        console.error("error", err)
      })) as IVarietyLeaf[][]

    console.info("::-RANDOMIZATION RESPONSE-::")
    console.log(response)
    if (response.length > 0 && !response[0]) {
      //response is an array or array of varieties, each with an array of varieties per layer
      response?.forEach((layer) => {
        const colorIndex = layer[0]?.origColorCode
        metadata[colorIndex].varieties = {
          [layer[0]?.newColorCode]: layer,
        }
      })
      //can i upload new stuff to layers and have it merge, or willi t overwrite layers:
      updateArtworkSet({ _id: projectId, layers: metadata }) // use swr here

      //check status and get URLs for randomized images, then upload to db, display results in view?
      // then generate random images from layerImages
    } else {
      console.warn("ISSUE WITH RESPONSE")
    }
    response?.length > 0 && setVarietyMetadata(response)
  }
  return (
    <Box className="App">
      <Center marginBlock="10">
        <Box>
          <FormControl isInvalid={!!errorMsg} isRequired>
            <FormLabel width={"50%"} htmlFor="imgUpload">
              Upload File:
            </FormLabel>
            <Input
              id="imgUpload"
              type="file"
              accept=".png, .jpg, .tiff, .tif, .gif"
              onChange={onFileInputChange}
            />
            {previewURI && (
              <Box>
                <Img src={previewURI} border={"1px solid red"} p={9} />
                <Divider w={"80%"} />
                <FormLabel width={"50%"} htmlFor="fuzzNum">
                  Amount of Fuzz (0-100%)
                </FormLabel>
                <Input
                  id="fuzzNum"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  onChange={(ev) => setFuzzNum(Number(ev.target.value))}
                />
                <br />
                {/* <FormLabel width={"50%"}>Amount of Colors (layers)</FormLabel>
                <Input
                  id="colorsNum"
                  type="number"
                  min={2}
                  max={20}
                  onChange={(ev) => setColorsNum(Number(ev.target.value))}
                /> */}
                <Button onClick={onClickUpload}>Get Layers</Button>
                <FormHelperText>{uploadStatus}</FormHelperText>
                {uploadStatus && <Progress size="xs" isIndeterminate />}
              </Box>
            )}
            {projectId && <Text>Project ID: {projectId}</Text>}
            {artworkLayers?.length > 0 && (
              <Grid
                templateColumns="repeat(3, 1fr)"
                gap={5}
                overflowX="scroll"
                width="100vw"
              >
                {artworkLayers?.map((url) => (
                  <GridItem key={url}>
                    <Image src={url} alt="Layer Image" />
                  </GridItem>
                ))}
              </Grid>
            )}
            {artworkLayers.length > 0 && (
              <Box>
                <FormLabel># of Colors</FormLabel>
                <Input
                  type="number"
                  placeholder={"1"}
                  min={1}
                  onChange={(e) => {
                    const newMeta = metadata
                    Object.entries(newMeta).forEach((iteration) => {
                      newMeta[iteration[0]].colorVariety = Number(
                        e.currentTarget.value,
                      )
                    })
                    setMetaData(newMeta)
                  }}
                />
                <Button
                  onClick={() => {
                    randomizeLayers()
                  }}
                >
                  Randomize Colors
                </Button>
              </Box>
            )}
            {varietyMetadata?.length > 0 && (
              <Grid
                templateColumns="repeat(3, 1fr)"
                gap={5}
                overflowX="scroll"
                width="100vw"
              >
                {varietyMetadata?.map((layer: IVarietyLeaf[]) =>
                  layer.map((variety) =>
                    !variety ? (
                      <Text>An Error has occurred...</Text>
                    ) : (
                      <GridItem
                        key={`${variety.imageUri}_${variety.origColorCode}_${variety.newColorCode}`}
                      >
                        <Image src={variety.imageUri} alt="Layer Image" />
                      </GridItem>
                    ),
                  ),
                )}
              </Grid>
            )}

            {errorMsg && <FormErrorMessage>{errorMsg}</FormErrorMessage>}
          </FormControl>
        </Box>
      </Center>
      {/* <SimpleGrid columns={2}>
        {IMAGES.map((path) => (
          <Center key={path}>
            <Box
              height="512"
              m={33}
              p={33}
              border="1px solid red"
              borderRadius={33}
              boxShadow="0 0 0.75rem crimson"
            >
              <Image
                alt="Gallery Image"
                src={path}
                maxHeight="100%"
                onError={(event) =>
                  (event.currentTarget.style.display = "none")
                }
              />
            </Box>
          </Center>
        ))}
      </SimpleGrid> */}
    </Box>
  )
}

export default App
