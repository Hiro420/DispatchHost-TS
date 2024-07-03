import fs from "fs";
import path from "path";
import http from "http";
import { Buffer, } from "buffer";
import protobuf from "protobufjs";
import { createBaseDispatch, createBaseDispatch_Region, Dispatch } from "./defs";

// define the constants
const PS_SERVER_IP = "127.0.0.1";
const PS_SERVER_PORT = 23301;
const DISPATCH_PORT = 443;
const serverName = "balls"

// check if proto files are present
if (!fs.readdirSync(__dirname).includes("Gateserver.proto")) {
    console.error("Please put the proto file (Gateserver.proto) in the root folder");
    process.exit(1);
}

// check if hotfix.json is present
if (!fs.existsSync(path.join(__dirname, "hotfix.json"))) {
    console.error("Please put the hotfix.json file in the root folder");
    process.exit(1);
}

async function doStuff() {
    // load the proto files
    const root = await protobuf.load("Gateserver.proto");
    const Gateserver_message = root.lookupType("Gateserver");

    // load the hotfix file
    const hotfix = JSON.parse(fs.readFileSync(path.join(__dirname, "hotfix.json"), "utf8"));

    const baseDispatchRegion = createBaseDispatch_Region();
    baseDispatchRegion.name = serverName;
    baseDispatchRegion.dispatchUrl = "http://127.0.0.1:443/query_gateway";
    baseDispatchRegion.env = "11";
    baseDispatchRegion.displayName = serverName;

    // create the dispatch message
    const message_dispatch = createBaseDispatch()
    message_dispatch.retcode = 0;
    message_dispatch.topSeverRegionName = serverName;
    message_dispatch.regionList.push(baseDispatchRegion);

    // encode the message as base64
    const buffer = Dispatch.encode(message_dispatch).finish();
    const encodedMessage = Buffer.from(buffer).toString("base64");

    // create the gateway message
    let message:any = Gateserver_message.create({
        msg: "Access verification failed. Please check if you have logged in to the correct account and server.",
        regionName: serverName,
        ip: PS_SERVER_IP,
        port: PS_SERVER_PORT,
        unk1: true,
        unk2: true,
        unk3: true,
        unk4: true,
        unk5: true,
    });

    // I hate this part so much, it looks so ugly
    if (hotfix.luaUrl) {
        message.luaUrl = hotfix.luaUrl;
        message.mdkResVersion = `${hotfix.customMdkResVersion ? hotfix.customMdkResVersion : hotfix.luaUrl.split("/").pop().split("_")[1]}`;
    }
    if (hotfix.exResourceUrl) {
        message.exResourceUrl = hotfix.exResourceUrl;
    }
    if (hotfix.assetBundleUrl) {
        message.assetBundleUrl = hotfix.assetBundleUrl;
    }
    if (hotfix.ifixUrl) {
        message.ifixUrl = hotfix.ifixUrl;
        message.ifixVersion = `${hotfix.customIfixVersion ? hotfix.customIfixVersion : hotfix.ifixUrl.split("/").pop().split("_")[1]}`;
    }

    // what am I doing with my life
    const buffer2 = Gateserver_message.encode(message).finish();
    const encodedMessage2 = Buffer.from(buffer2).toString("base64");

    // please help me
    const server_dispatch = http.createServer((req, res) => {
        if (req.method === "GET" && req.url?.startsWith("/query_dispatch")) {
            res.writeHead(200, { "Content-Type": "text; charset=UTF-8" });
            console.log("Sending dispatch message");
            res.end(encodedMessage);
        }
        if (req.method === "GET" && req.url?.startsWith("/query_gateway")) {
            res.writeHead(200, { "Content-Type": "text; charset=UTF-8" });
            console.log("Sending gateway message");
            res.end(encodedMessage2);
        }
    });

    // *inserts :qiqi_dead: emoji here*
    server_dispatch.listen(DISPATCH_PORT, () => {
        console.log(`Server running at http://127.0.0.1:${DISPATCH_PORT}/`);
    });
}

// I'm so sorry for making you read this code :3
try {
    doStuff();
} catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
}