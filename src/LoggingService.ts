import { window } from "vscode";

enum LogLevel {
    error = "ERROR",
    info = "INFO"
}

export class LoggingService {
    private outputChannel = window.createOutputChannel("Dynatrace");

    public logInfo(message: string) {
        this.logMessage(message, LogLevel.info);
    }

    public logError(message: string) {
        this.logMessage(message, LogLevel.error);
    }

    private logMessage(message: string, logLevel: LogLevel): void {
        const date = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`["${logLevel}" - ${date}] ${message}`);
    }
}