import {Logger} from "tslog";
import {Server} from "ts-jobserver-simple/dist/core/Server";
import {Jpeg2TxtWorker} from "./Jpeg2TxtWorker";

const logger = new Logger({name: "jpeg2txt-job-server"});
try {
    logger.info("starting");
    const jobServer = new Server({
        logger: logger,
        workdir: '/tmp',
        port: 80
    });

    const sighandler = async () => {
	logger.info("Stop signal received, shutting down.");
	await jobServer.shutdown();
	process.exit(0);
    };

    process.on('SIGINT', sighandler);
    process.on('SIGHUP', sighandler);
    process.on('SIGTERM', sighandler);

    jobServer.registerWorkerType(Jpeg2TxtWorker);

    jobServer.start().then(() => {
        logger.info("started");
    }).catch((e) => {
        logger.error("cannot start", e);
    });
} catch (error) {
    logger.error("error during initialization", error);
}
