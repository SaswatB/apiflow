declare module "electron-promise-ipc" {
    function send(route: string, ...data: unknown[]): Promise<unknown>
    function on(route: string, listener: Function): PromiseIpc
    function off(route: string, listener?: Function): void
    function removeListener(route: string, listener?: Function): void
}