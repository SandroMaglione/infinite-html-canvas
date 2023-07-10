export class InfiniteCanvas {
  canvas: HTMLCanvasElement | null = null;
  context: CanvasRenderingContext2D | null = null;
  cellSize: number;

  #scale = 1;
  #offsetX = 0;
  #offsetY = 0;

  #touchMode: "single" | "double" = "single";
  #prevTouch: [Touch | null, Touch | null] = [null, null];

  constructor(cellSize = 40) {
    this.cellSize = cellSize;

    const canvas = document.getElementById("canvas");
    if (canvas && canvas instanceof HTMLCanvasElement) {
      this.canvas = canvas;
      this.#setupEvents(canvas);

      const context = canvas.getContext("2d");

      if (context) {
        this.context = context;
        this.#draw();
      } else {
        console.error(`<canvas> element is missing context 2d`);
      }
    } else {
      console.error(`<canvas> element with id="canvas" not found`);
    }
  }

  toScreenX(xTrue: number): number {
    return (xTrue + this.#offsetX) * this.#scale;
  }
  toScreenY(yTrue: number): number {
    return (yTrue + this.#offsetY) * this.#scale;
  }
  toTrueX(xScreen: number): number {
    return xScreen / this.#scale - this.#offsetX;
  }
  toTrueY(yScreen: number): number {
    return yScreen / this.#scale - this.#offsetY;
  }

  trueHeight(): number {
    return (this.canvas?.clientHeight ?? 0) / this.#scale;
  }

  trueWidth(): number {
    return (this.canvas?.clientWidth ?? 0) / this.#scale;
  }

  zoom(amount: number): void {
    this.#scale *= amount;
    this.#draw();
  }

  offsetLeft(amount: number): void {
    this.#offsetX -= amount;
    this.#draw();
  }

  offsetRight(amount: number): void {
    this.#offsetX += amount;
    this.#draw();
  }

  offsetUp(amount: number): void {
    this.#offsetY -= amount;
    this.#draw();
  }

  offsetDown(amount: number): void {
    this.#offsetY += amount;
    this.#draw();
  }

  #draw(): void {
    if (this.canvas && this.context) {
      this.canvas.width = document.body.clientWidth;
      this.canvas.height = document.body.clientHeight;
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.#drawGrid();
    }
  }

  #setupEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("touchstart", (event) =>
      this.#onTouchStart(event.touches)
    );

    canvas.addEventListener("touchmove", (event) =>
      this.#onTouchMove(event.touches)
    );

    window.addEventListener("resize", () => this.#draw());
  }

  #onTouchStart(touches: TouchList): void {
    if (touches.length == 1) {
      this.#touchMode = "single";
    } else if (touches.length >= 2) {
      this.#touchMode = "double";
    }

    // Store the last touches
    this.#prevTouch[0] = touches[0];
    this.#prevTouch[1] = touches[1];

    this.#onTouchMove(touches);
  }

  #onTouchMove(touches: TouchList): void {
    // Get first touch coordinates
    const touch0X = touches[0].pageX;
    const touch0Y = touches[0].pageY;

    const prevTouch0X = this.#prevTouch[0]!.pageX;
    const prevTouch0Y = this.#prevTouch[0]!.pageY;

    if (this.#touchMode === "single") {
      // Single touch (setup click event)
    } else if (this.#touchMode === "double") {
      // get second touch coordinates
      const touch1X = touches[1].pageX;
      const touch1Y = touches[1].pageY;

      const prevTouch1X = this.#prevTouch[1]!.pageX;
      const prevTouch1Y = this.#prevTouch[1]!.pageY;

      const scaleAmount = this.#zoom(
        [touch0X, touch0Y],
        [prevTouch0X, prevTouch0Y],
        [touch1X, touch1Y],
        [prevTouch1X, prevTouch1Y]
      );

      this.#pan(
        scaleAmount,
        [touch0X, touch0Y],
        [prevTouch0X, prevTouch0Y],
        [touch1X, touch1Y],
        [prevTouch1X, prevTouch1Y]
      );

      this.#draw();
    }

    this.#prevTouch[0] = touches[0];
    this.#prevTouch[1] = touches[1];
  }

  #pan(
    scaleAmount: number,
    [touch0X, touch0Y]: [number, number],
    [prevTouch0X, prevTouch0Y]: [number, number],
    [touch1X, touch1Y]: [number, number],
    [prevTouch1X, prevTouch1Y]: [number, number]
  ): void {
    // get midpoints
    const midX = (touch0X + touch1X) / 2;
    const midY = (touch0Y + touch1Y) / 2;
    const prevMidX = (prevTouch0X + prevTouch1X) / 2;
    const prevMidY = (prevTouch0Y + prevTouch1Y) / 2;

    // Calculate how many pixels the midpoints have moved in the x and y direction
    const panX = midX - prevMidX;
    const panY = midY - prevMidY;

    // Scale this movement based on the zoom level
    this.#offsetX += panX / this.#scale;
    this.#offsetY += panY / this.#scale;

    // Get the relative position of the middle of the zoom.
    // 0, 0 would be top left.
    // 0, 1 would be top right etc.
    var zoomRatioX = midX / (this.canvas?.clientWidth ?? 1);
    var zoomRatioY = midY / (this.canvas?.clientHeight ?? 1);

    // calculate the amounts zoomed from each edge of the screen
    const unitsZoomedX = this.trueWidth() * scaleAmount;
    const unitsZoomedY = this.trueHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * zoomRatioX;
    const unitsAddTop = unitsZoomedY * zoomRatioY;

    this.#offsetX += unitsAddLeft;
    this.#offsetY += unitsAddTop;
  }

  #zoom(
    [touch0X, touch0Y]: [number, number],
    [prevTouch0X, prevTouch0Y]: [number, number],
    [touch1X, touch1Y]: [number, number],
    [prevTouch1X, prevTouch1Y]: [number, number]
  ): number {
    const hypot = Math.sqrt(
      Math.pow(touch0X - touch1X, 2) + Math.pow(touch0Y - touch1Y, 2)
    );

    const prevHypot = Math.sqrt(
      Math.pow(prevTouch0X - prevTouch1X, 2) +
        Math.pow(prevTouch0Y - prevTouch1Y, 2)
    );

    const zoomAmount = hypot / prevHypot;
    this.zoom(zoomAmount);

    const scaleAmount = 1 - zoomAmount;
    return scaleAmount;
  }

  #drawGrid(): void {
    if (this.canvas && this.context) {
      this.context.strokeStyle = "rgb(229,231,235)";
      this.context.lineWidth = 1;
      this.context.font = "10px serif";
      this.context.beginPath();

      const width = this.canvas?.clientWidth ?? 0;
      const height = this.canvas?.clientHeight ?? 0;

      for (
        let x = (this.#offsetX % this.cellSize) * this.#scale;
        x <= width;
        x += this.cellSize * this.#scale
      ) {
        const source = x;
        this.context.moveTo(source, 0);
        this.context.lineTo(source, height);

        this.context.fillText(
          `${this.toScreenX(source).toFixed(0)}`,
          source,
          10
        );
      }

      for (
        let y = (this.#offsetY % this.cellSize) * this.#scale;
        y <= height;
        y += this.cellSize * this.#scale
      ) {
        const destination = y;
        this.context.moveTo(0, destination);
        this.context.lineTo(width, destination);

        this.context.fillText(
          `${this.toScreenY(destination).toFixed(0)}`,
          0,
          destination
        );
      }
      this.context.stroke();
    }
  }
}
