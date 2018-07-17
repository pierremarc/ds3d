import { vec3, vec2 } from 'gl-matrix';
import { data } from './data';
import { data2 } from './data2';
import { Camera, getTranformFunction, Transform } from './mat'

type FC = typeof data | typeof data2
type F = typeof data.features[0] | typeof data2.features[0]

type Finalizer = (c: CanvasRenderingContext2D) => void;
type Transformer = (pt: vec3) => vec2;
type Prepper = (c: CanvasRenderingContext2D, f: F) => () => void;
type n3 = [number, number, number];


function scalarDiv2(a: vec2, s: number) {
    return vec2.fromValues(a[0] / s, a[1] / s);
}

function scalarMul2(a: vec2, s: number) {
    return vec2.fromValues(a[0] * s, a[1] * s);
}

const zAxis = vec3.fromValues(0, 0, 1);

// << utils
export interface Reducer {
    f: (acc: number, p: n3) => number;
    init: number;
}

export function reduceLineString(r: Reducer, p: n3[]) {
    return p.reduce(r.f, r.init);
}

export function reducePolygon(r: Reducer, p: n3[][]) {
    const ls = p.reduce((acc, p) => acc.concat(p), []);
    return reduceLineString(r, ls);
}

export function reduceMultiPolygon(r: Reducer, m: n3[][][]) {
    const ps = m.reduce((acc, p) => acc.concat(p), []);
    return reducePolygon(r, ps);
}

// >> utils


function getLineRingCoord(t: Transformer, lr: n3[]) {
    return lr.map(pt => t(vec3.fromValues(pt[0], pt[1], pt[2])));
}

function getPolygonCoords(t: Transformer, p: n3[][]) {
    return p.map(lr => getLineRingCoord(t, lr));
}

function getMultiPolygonCoords(t: Transformer, m: n3[][][]) {
    return m.map(p => getPolygonCoords(t, p));
}


const d2r = (a: number) => a * Math.PI / 180


// draw
function drawLineRingCoord(ctx: CanvasRenderingContext2D, finalizer: Finalizer, lr: vec2[]) {
    const start = lr[0];
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    lr.slice(1).forEach(pt => ctx.lineTo(pt[0], pt[1]));
    finalizer(ctx);
}

function drawPolygonCoords(ctx: CanvasRenderingContext2D, finalizer: Finalizer, p: vec2[][]) {
    return p.map(lr => drawLineRingCoord(ctx, finalizer, lr));
}

function drawMultiPolygonCoords(ctx: CanvasRenderingContext2D, finalizer: Finalizer, m: vec2[][][]) {
    return m.map(p => drawPolygonCoords(ctx, finalizer, p));
}


function main() {
    const height = window.innerHeight * 0.9;
    const width = window.innerWidth * 0.9;



    const painter =
        (
            ctx: CanvasRenderingContext2D,
            prep: Prepper,
            fin: Finalizer,
            fc: FC,
        ) => (t: Transform) => {
            const fs = fc.features;
            for (let i = 0; i < fs.length; i++) {
                const f = fs[i]
                const geom = f.geometry
                const gt = geom.type
                const end = prep(ctx, f);
                if (gt === 'Polygon') {
                    drawPolygonCoords(ctx, fin,
                        getPolygonCoords(t, geom.coordinates as n3[][]));
                }
                else if (gt === 'MultiPolygon') {
                    drawMultiPolygonCoords(ctx, fin,
                        getMultiPolygonCoords(t, geom.coordinates as n3[][][]));
                }
                end();
            }
        };


    const buildingFinalizer: Finalizer = c => c.stroke();
    const roofFinalizer: Finalizer = (c) => {
        c.fill();
        c.stroke()
    }

    const buildingPrepper: Prepper =
        (c) => {
            c.save();
            c.strokeStyle = '#666';
            c.lineWidth = 1;
            return () => c.restore();
        };

    const roofPrepper: Prepper =
        (c) => {
            c.save();
            c.strokeStyle = '#66a';
            c.lineWidth = 0.5;
            c.fillStyle = '#8db63c';
            return () => c.restore();
        };


    const canvas = document.createElement('canvas')
    // const canvas = document.createElement('canvas')
    canvas.setAttribute('width', width.toFixed())
    canvas.setAttribute('height', height.toFixed())
    const context = canvas.getContext('2d')
    document.body.appendChild(canvas);

    const camdbg = document.createElement('div')
    const targetdbg = document.createElement('div')
    document.body.appendChild(camdbg)
    document.body.appendChild(targetdbg)

    if (context) {

        const target = vec3.fromValues(149000.0, 167742.933, 80)
        const pos = vec3.fromValues(target[0], target[1] - 500, target[2] + 400)
        const viewport = vec2.fromValues(width, height)
        let cam: Camera = { pos, target, viewport }

        const buildingPainter = painter(context, buildingPrepper, buildingFinalizer, data);
        const roofPainter = painter(context, roofPrepper, roofFinalizer, data2);
        const renderFrame =
            (ctx: CanvasRenderingContext2D, t: Transform) => {
                ctx.clearRect(0, 0, width, height);
                buildingPainter(t)
                // roofPainter(t)
            };

        const fr = 1000 / 60;
        let lastTS = performance.now()
        let cont = false

        const render =
            (ts: number) => {
                if ((ts - lastTS) > fr) {
                    lastTS = ts

                    const tranform = getTranformFunction(cam);
                    renderFrame(context, tranform)
                    cam = {
                        ...cam,
                        pos: vec3.rotateZ(vec3.create(), cam.pos, cam.target, d2r(.6))
                    }
                }
                if (cont) {
                    requestAnimationFrame(render)
                }
            }


        const start = document.createElement('div')
        document.body.appendChild(start)
        start.innerHTML = 'START'
        start.addEventListener('click', () => {
            cont = true;
            requestAnimationFrame(render)
        })

        const stop = document.createElement('div')
        document.body.appendChild(stop)
        stop.innerHTML = 'STOP'
        stop.addEventListener('click', () => cont = false)


        render(lastTS + 2 * fr)

    }


}

document.onreadystatechange = () => {
    if ('interactive' === document.readyState) {
        main()
    }
}
