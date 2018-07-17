import { vec3, vec2 } from 'gl-matrix';
import { Camera, getTranformFunction, Transform } from './mat'
import { FeatureCollection, Feature, FeatureCollectionIO, Position } from 'geojson-iots'

const dataURL = 'http://localhost:8000/selec2.json'

type Finalizer = (c: CanvasRenderingContext2D) => void;
type Transformer = (pt: vec3) => vec2;
type Prepper = (c: CanvasRenderingContext2D) => () => void;
type n3 = [number, number, number];


function scalarDiv2(a: vec2, s: number) {
    return vec2.fromValues(a[0] / s, a[1] / s);
}

function scalarDiv3(a: vec3, s: number) {
    return vec3.fromValues(a[0] / s, a[1] / s, a[2] / s);
}

function scalarMul2(a: vec2, s: number) {
    return vec2.fromValues(a[0] * s, a[1] * s);
}

function vec3Sum(vs: vec3[]) {
    return (vs.reduce((acc, v) => vec3.add(vec3.create(), acc, v), vec3.create()))
}

function vec3Mean(vs: vec3[]) {
    return scalarDiv3(vec3Sum(vs), vs.length)
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


function getLineRingCoord(t: Transformer, lr: Plane) {
    return lr.map(pt => t(vec3.fromValues(pt[0], pt[1], pt[2])));
}

function getPolygonCoords(t: Transformer, p: PlaneCollection) {
    return p.map(lr => getLineRingCoord(t, lr));
}

// function getMultiPolygonCoords(t: Transformer, m: n3[][][]) {
//     return m.map(p => getPolygonCoords(t, p));
// }


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






type Plane = vec3[]
type PlaneCollection = Plane[]

function clonePlane(p: Plane) {
    return p.map(v => vec3.fromValues(v[0], v[1], v[2]))
}

function clonePlaneCollection(ps: PlaneCollection) {
    return ps.map(clonePlane)
}

function getZ(plane: Plane, t: Transform) {
    const z = (p: vec3) => p[2]
    const init = Number.MAX_VALUE
    return plane.reduce((acc, v) => Math.min(acc, z(v)), init)
}


function getPlanes(fs: Feature[]): PlaneCollection {
    const result: PlaneCollection = []
    fs.forEach((f) => {
        const geom = f.geometry
        if (geom.type === 'Polygon') {
            const cs = geom.coordinates as number[][][];
            cs.forEach((l) => {
                const vl: Plane = []
                l.forEach(c => vl.push(vec3.fromValues(c[0], c[1], c[2])))
                result.push(vl)
            })
        }
        else if (geom.type === 'MultiPolygon') {
            const cs = geom.coordinates as number[][][][];
            cs.forEach((p) => {
                p.forEach((l) => {
                    const vl: Plane = []
                    l.forEach(c => vl.push(vec3.fromValues(c[0], c[1], c[2])))
                    result.push(vl)
                })
            })
        }
    })

    return result
}


// function sortedPlanes(ps: PlaneCollection, t: Transform) {
//     return clonePlaneCollection(ps).sort((a, b) => {
//         const za = getZ(a, t)
//         const zb = getZ(b, t)
//         if (za < zb) {
//             return -1
//         } if (za > zb) {
//             return 1
//         }
//         return 0
//     })
// }

function sortedPlanes(ps: PlaneCollection, c: vec3) {
    return clonePlaneCollection(ps).sort((a, b) => {
        // const da = vec3.dist(c, vec3Mean(a))
        // const db = vec3.dist(c, vec3Mean(b))
        const da = a.reduce((acc, v) => Math.max(vec3.dist(c, v), acc), Number.MIN_VALUE)
        const db = b.reduce((acc, v) => Math.max(vec3.dist(c, v), acc), Number.MIN_VALUE)
        if (da < db) {
            return 1
        } if (da > db) {
            return -1
        }
        return 0
    })
}


function main() {
    const height = window.innerHeight * 0.9;
    const width = window.innerWidth * 0.9;



    const painter =
        (
            ctx: CanvasRenderingContext2D,
            prep: Prepper,
            fin: Finalizer,
            planes: PlaneCollection,
        ) => (t: Transform, c: vec3) => {
            const ps = sortedPlanes(planes, c);
            ps.forEach((p) => {
                const end = prep(ctx);
                drawLineRingCoord(ctx, fin, getLineRingCoord((pt: vec3) => t(pt, true), p))
                end()
            })
            // for (let i = 0; i < fs.length; i++) {
            //     const f = fs[i]
            //     const geom = f.geometry
            //     const end = prep(ctx, f);
            //     if (geom.type === 'Polygon') {
            //         drawPolygonCoords(ctx, fin,
            //             getPolygonCoords(t, geom.coordinates as n3[][]));
            //     }
            //     else if (geom.type === 'MultiPolygon') {
            //         drawMultiPolygonCoords(ctx, fin,
            //             getMultiPolygonCoords(t, geom.coordinates as n3[][][]));
            //     }
            //     end();
            // }
        };


    const buildingFinalizer: Finalizer = (c) => {
        c.fill();
        c.stroke()
    }
    const roofFinalizer: Finalizer = (c) => {
        c.fill();
        c.stroke()
    }

    const buildingPrepper: Prepper =
        (c) => {
            c.save();
            c.strokeStyle = '#1860a0';
            // c.fillStyle = '#fcfbf7';
            c.fillStyle = 'rgba(252,251,247,0.6)';
            c.lineWidth = 0.2;
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



    if (context) {

        const headers = new Headers();
        headers.append('Content-type', 'application/json')
        fetch(dataURL, {
            // mode: 'no-cors',
            // headers,
        })
            .then((resp) => {
                if (resp.ok) {
                    console.log('Response OK')
                    return resp.json()
                }
                return Promise.reject(resp.status)
            })
            .then((data) => FeatureCollectionIO.validate(data, []))
            .then((dataE) => {
                dataE.fold(
                    (err) => console.error(err),
                    (data) => {

                        const sc = 730;
                        const target = vec3.fromValues(149000.0 + 500, 167742.933 + 720, 80)
                        const pos = vec3.fromValues(target[0], target[1] - sc, target[2] + sc)
                        const viewport = vec2.fromValues(width, height)
                        let cam: Camera = { pos, target, viewport }

                        const buildingPainter = painter(context, buildingPrepper, buildingFinalizer, getPlanes(data.features));
                        // const roofPainter = painter(context, roofPrepper, roofFinalizer, data2);
                        const renderFrame =
                            (ctx: CanvasRenderingContext2D, t: Transform) => {
                                ctx.clearRect(0, 0, width, height);
                                buildingPainter(t, cam.pos)
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

                    })
            })
            .catch(err => console.error(err))
    }


}

document.onreadystatechange = () => {
    if ('interactive' === document.readyState) {
        main()
    }
}
