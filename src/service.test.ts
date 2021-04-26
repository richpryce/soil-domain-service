import { Context } from "aws-lambda";
import { saveSoilSample } from "./service";
import { saveItems } from "./database";
import { getS3Object, convertXlsxToJson, convertCsvToJson } from "./objectStore";
import event from "./lib/trigger.json";
import csvEvent from "./lib/csvtrigger.json";

// typescript magic..
function mockFunction<T extends (...args: any[]) => any>(fn: T): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}

const emptyContext: Context = {} as any;

jest.mock("./objectStore");
jest.mock("./database");
jest.mock("aws-sdk");

const getS3ObjectMock = mockFunction(getS3Object);
const saveItemsMock = mockFunction(saveItems);
const convertXlsxToJsonMock = mockFunction(convertXlsxToJson);
const convertCsvToJsonMock = mockFunction(convertCsvToJson);

describe("Soil Domain service tests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  test("Database is called on save with xlsx", async () => {
    convertXlsxToJsonMock.mockReturnValue(
      Promise.resolve({
        jsonObject:
          '[{ "Sample_description": "test sample","data": "test data"},{"Sample_description": "test2","data": "sampledata"}]',
      })
    );
    await saveSoilSample(event, emptyContext, () => {});
    expect(convertXlsxToJsonMock).toBeCalled();
    expect(getS3ObjectMock).toBeCalled();
    expect(saveItemsMock).toBeCalled();
  });
  test("Database is called on save with csv", async () => {
    convertCsvToJsonMock.mockReturnValue(
      Promise.resolve({
        jsonObject:
          '[{ "Sample_description": "test sample","data": "test data"},{"Sample_description": "test2","data": "sampledata"}]',
      })
    );
    await saveSoilSample(csvEvent, emptyContext, () => {});
    expect(convertCsvToJsonMock).toBeCalled();
    expect(getS3ObjectMock).toBeCalled();
    expect(saveItemsMock).toBeCalled();
  });

  test("Throws error on Database error", async () => {
    const databaseError = new Error("database");
    let thrownError = new Error("something");
    getS3ObjectMock.mockReturnValue(Promise.reject(databaseError));
    try {
      await saveSoilSample(event, emptyContext, () => {});
    } catch (error) {
      thrownError = error;
    }
    expect(saveItemsMock).not.toBeCalled();
    expect(thrownError).toBe(databaseError);
  });
  test("Database not called if primary key is incorrect", async () => {
    convertXlsxToJsonMock.mockReturnValue(
      Promise.resolve({ jsonObject: '[{ "IncorrectPrimaryKey": "test"}]' })
    );
    await saveSoilSample(event, emptyContext, () => {});
    expect(getS3ObjectMock).toBeCalled();
    expect(saveItemsMock).not.toBeCalled();
  });
});

export {};
