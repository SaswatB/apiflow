declare module "ramjet" {
	function transform ( fromNode: HTMLElement, toNode: HTMLElement, options: object | Function = {} );
	function hide ( ...nodes: HTMLElement[] );
	function show ( ...nodes: HTMLElement[] );
    function linear(pos: number): number;
    function easeIn(pos: number): number;
    function easeOut(pos: number): number;
    function easeInOut(pos: number): number;
}