import {copyFile, mkdir, rmdir, writeFile} from "fs/promises";
import {promisify} from "util";
import {exec, execFile} from "child_process";
import {RmOptions} from "fs";
import {AbstractWorker} from "ts-jobserver-simple/dist/core/AbstractWorker";
import {IWorker} from "ts-jobserver-simple/dist/core/IWorker";
import {JobStatus} from "ts-jobserver-simple/dist/core/JobStatus";

export class Jpeg2TxtWorker extends AbstractWorker {

    protected IN_DPI = 150;
    protected IN_LANGUAGE = 'hun';

    static BIN_UNZIP = '/usr/bin/unzip';
    static BIN_TESSERACT = '/usr/bin/tesseract';

    async do(): Promise<IWorker> {
        this.logger.info("start");
        this.job.status = JobStatus.Running;

        let success = await this.createTempDir();
        if (success) success = await this.unzipJpegs();
        if (success) success = await this.genJpegList();
        if (success) success = await this.generateTxt();
        if (success) success = await this.removeTempDir();

        this.logger.info("end");
        return this;
    }

    protected async createTempDir() {
        try {
            this.logger.debug("create-temp-dir");
            await mkdir(this.job.workDir);
            await mkdir(this.job.workDir + `/jpeg`);
            await copyFile(this.job.inputFile, this.job.workDir + '/jpeg/source.zip');
            return true;
        } catch (e) {
            this.logger.error("create-temp-dir failed", e);
            this.job.status = JobStatus.Error;
            return false;
        }
    }

    protected async genJpegList() {
        const exec = promisify(execFile);
        try {
            let fileList = "source.txt";
            let dir = this.job.workDir + '/jpeg/';
            // Generate JPEG list into a text file
            this.logger.debug("generate list of jpegs", dir, fileList);
            const {stdout, stderr} = await exec('/bin/ls', ['-1', '*.jpg'], {cwd: dir});
            console.log(stdout);
            console.log(stderr);
            this.logger.debug('write list file');
            await writeFile(fileList, stdout);
            return true;
        } catch (e) {
            this.logger.error("gen-jpegs failed", e);
            this.job.status = JobStatus.Error;
            return false;
        }
    }

    protected async unzipJpegs() {
        const exec = promisify(execFile);
        try {
            this.logger.info("unzip-jpegs");
            let zip = this.job.workDir + '/jpeg/source.zip'
            let dir = this.job.workDir + '/jpeg/';
            const {stdout, stderr} = await exec(Jpeg2TxtWorker.BIN_UNZIP, [zip], {cwd: dir});
            console.log(stdout);
            console.log(stderr);
            return true;
        } catch (e) {
            this.logger.error("unzip-jpegs failed", e);
            this.job.status = JobStatus.Error;
            return false;
        }
    }

    protected async generateTxt() {
        const exec = promisify(execFile);

        try {
            this.logger.info("generate-txt");
            let dir = this.job.workDir + '/jpeg/';
            let fileList = "source.txt";
            let outFilePrefix = "result";

            // Process JPEGS: ocr to all files referenced in the text file
            this.logger.debug("executing tesseract", dir, fileList);
            let {stdout, stderr} = await exec(Jpeg2TxtWorker.BIN_TESSERACT, [
                '--dpi ' + this.IN_DPI,
                '-l ' + this.IN_LANGUAGE,
                fileList,
                outFilePrefix
            ], {cwd: dir});

            console.log(stdout);
            console.error(stderr);
            return true;
        } catch (e) {
            this.logger.error("generate-txt failed", e);
            this.job.status = JobStatus.Error;
            return false;
        }
    }

    protected async removeTempDir() {
        try {
            this.logger.info("remove-temp-dir");
            await copyFile(this.job.workDir + '/jpeg/result.txt', this.job.outputFile);
            this.job.status = JobStatus.Finished;
            await rmdir(this.job.workDir, <RmOptions>{force: true, recursive: true});
            return true;
        } catch (e) {
            this.logger.error("remove-temp-dir failed", e);
            this.job.status = JobStatus.Error;
            return false;
        }
    }

    getInputContentType(): string {
        return "application/zip";
    }

    getOutputContentType(): string {
        return "text/plain";
    }

}