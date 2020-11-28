import {Logger} from "tslog";
import {Server} from "ts-jobserver-simple/dist/core/Server";
import {Jpeg2TxtWorker} from "./Jpeg2TxtWorker";

const logger = new Logger({name: "pdf2jpeg-job-server"});
try {
    logger.info("starting");
    const jobServer = new Server({
        logger: logger,
        workdir: '/tmp',
        port: 8080
    });
    process.on('SIGINT', async () => {
        logger.info("SIGINT received, shutting down.");
        await jobServer.shutdown();
    });

    jobServer.registerWorkerType(Jpeg2TxtWorker);

    Promise.all([jobServer.start()]).then(() => {
        logger.info("started");
    }).catch((e) => {
        logger.error("cannot start", e);
    });
} catch (error) {
    logger.error("error during initialization", error);
}
