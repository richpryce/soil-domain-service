import { S3Handler } from "aws-lambda";
import path from "path";
import AWS from "aws-sdk";
import { saveItems } from "./database";
import { getS3Object } from "./objectStore";
import { csvToJson, xlsxToJson } from "./converter";

const primaryKey: string = "Sample_description";

const saveSoilSample: S3Handler = async (event) => {
  const { name: Bucket } = event.Records[0].s3.bucket;
  const { key: Key } = event.Records[0].s3.object;
  const s3 = new AWS.S3();
  const maxFileSize = 500000;
  // eslint-disable-next-line func-names
  s3.headObject({ Bucket, Key }, function (err, data: any) {
    if (err) console.log(err, err.stack);
    console.log(`Content Length - ${data.ContentLength} content type = ${data.ContentType}`);
    if (data.ContentLength > maxFileSize) {
      throw new Error("file too large");
    }
  });

  const s3Object = await getS3Object({ Bucket, Key });
  const fileName = event.Records[0].s3.object.key;
  const fileType = path.extname(fileName);

  let dataJson;
  if (fileType === ".xlsx") {
    try {
      const xlsxData: any = await xlsxToJson(s3Object);
      dataJson = xlsxData;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  } else if (fileType === ".csv") {
    try {
      const csvData: any = await csvToJson(s3Object);
      dataJson = csvData;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }
  try {
    if (Object.keys(dataJson[0])[0] !== primaryKey) {
      throw new Error("Incorrect primary key");
    }
    await saveItems(dataJson);
    // eslint-disable-next-line no-console
    console.log("Success!");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`Something went wrong. Error: ${e}`);
  }
};

export { saveSoilSample };
