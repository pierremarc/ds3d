import { vec3, mat3, mat4, vec2 } from 'gl-matrix';
import { data } from './data';
import { data2 } from './data2';


function scalarDiv2(a: vec2, s: number) {
    return vec2.fromValues(a[0] / s, a[1] / s)
}
function scalarDiv3(a: vec3, s: number) {
    return vec3.fromValues(a[0] / s, a[1] / s, a[2] / s)
}


function scalarMul2(a: vec2, s: number) {
    return vec2.fromValues(a[0] * s, a[1] * s)
}

function scalarMul3(a: vec3, s: number) {
    return vec3.fromValues(a[0] * s, a[1] * s, a[2] * s)
}

function scalarAdd3(a: vec3, s: number) {
    return vec3.fromValues(a[0] + s, a[1] + s, a[2] + s)
}

type n3 = [number, number, number];

const vts2 = (v: vec2) => `vec2(${v[0].toFixed(2)},${v[1].toFixed(2)})`
const vts = (v: vec3) => `vec3(${v[0].toFixed(2)},${v[1].toFixed(2)},${v[2].toFixed(2)})`


const d2r = (a: number) => a * Math.PI / 180
const r2d = (a: number) => a * 180 / Math.PI

const xAxis = vec3.fromValues(1, 0, 0)
const yAxis = vec3.fromValues(0, 1, 0)
const zAxis = vec3.fromValues(0, 0, 1)



// it's not in the decl file :/
function angle2(a: vec2, b: vec2) {
    let x1 = a[0],
        y1 = a[1],
        x2 = b[0],
        y2 = b[1];

    let len1 = x1 * x1 + y1 * y1;
    if (len1 > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len1 = 1 / Math.sqrt(len1);
    }

    let len2 = x2 * x2 + y2 * y2;
    if (len2 > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len2 = 1 / Math.sqrt(len2);
    }

    let cosine = (x1 * x2 + y1 * y2) * len1 * len2;


    if (cosine > 1.0) {
        return 0;
    }
    else if (cosine < -1.0) {
        return Math.PI;
    } else {
        return Math.acos(cosine);
    }
}

function dropz(v: vec3) {
    return vec2.fromValues(v[0], v[1])
}

let DEBUG = false;

const assert =
    (c: boolean, ...what: string[]) => {
        if (!c) {
            console.error(...what)
        }
    }

const rotMatY = mat4.fromRotation(mat4.create(), d2r(90), yAxis)

function getPointViewCoord(viewport: vec2, cam: vec3, target: vec3, pt: vec3) {

    const tref = vec3.fromValues(target[0], target[1], target[2] + 10)
    const CT = vec3.sub(vec3.create(), target, cam)
    const tref0 = vec3.sub(vec3.create(), tref, cam)
    const pt0 = vec3.sub(vec3.create(), pt, cam)

    const angle = vec3.angle(CT, zAxis)
    const normal = vec3.cross(vec3.create(), zAxis, CT)
    const rotMat = mat4.fromRotation(mat4.create(), -angle, normal)



    const ptRot = rotMat === null ?
        pt0 :
        vec3.transformMat4(vec3.create(), pt0, rotMat)

    const trefRot = rotMat === null ?
        tref0 :
        vec3.transformMat4(vec3.create(), tref0, rotMat)


    if (DEBUG) {
        console.log('Result', vts(CT), '=>', vts(vec3.transformMat4(vec3.create(), CT, rotMat)))
        console.log('Angle', r2d(angle))
        console.log('Normal', vts(normal))
    }

    let pt2d = vec2.fromValues(ptRot[0], ptRot[1])

    // 4.5 - scaling
    const dist = vec3.dist(cam, target);
    pt2d = scalarMul2(pt2d, viewport[0] / dist)

    // remeber the ref?
    const ref2d = vec2.fromValues(trefRot[0], trefRot[1])
    const refAngle = angle2(vec2.fromValues(0, -1), ref2d);
    if (DEBUG) {
        console.log('Ref', vts(trefRot))
        console.log('Ref2d', vts2(ref2d))
        console.log('RefAngle', Math.round(r2d(refAngle)))
    }
    const zrot = mat3.fromRotation(mat3.create(),
        ref2d[0] < 0 ? refAngle : -refAngle)
    pt2d = vec2.transformMat3(pt2d, pt2d, zrot)

    // 5 - get a translation mat3 that translate cam to viewport center and translate point with it
    const toCenter = mat3.fromTranslation(mat3.create(), scalarDiv2(viewport, 2))
    const ret = vec2.transformMat3(vec2.create(), pt2d, toCenter)



    // console.log(`${pt} -> ${ret}`)

    return ret
}



function getLineRingCoord(viewport: vec2, cam: vec3, v: vec3, lr: n3[]) {
    return lr.map(pt => getPointViewCoord(viewport, cam, v, vec3.fromValues(pt[0], pt[1], pt[2])))
}

function getPolygonCoords(viewport: vec2, cam: vec3, v: vec3, p: n3[][]) {
    return p.map(lr => getLineRingCoord(viewport, cam, v, lr))
}

function getMultiPolygonCoords(viewport: vec2, cam: vec3, v: vec3, m: n3[][][]) {
    return m.map(p => getPolygonCoords(viewport, cam, v, p))
}


// draw

type Finalizer = (c: CanvasRenderingContext2D) => void

function drawLineRingCoord(ctx: CanvasRenderingContext2D, finalizer: Finalizer, lr: vec2[]) {
    const start = lr[0]
    ctx.beginPath()
    ctx.moveTo(start[0], start[1])
    lr.slice(1).forEach(pt => ctx.lineTo(pt[0], pt[1]))
    finalizer(ctx)
}

function drawPolygonCoords(ctx: CanvasRenderingContext2D, finalizer: Finalizer, p: vec2[][]) {
    return p.map(lr => drawLineRingCoord(ctx, finalizer, lr))
}

function drawMultiPolygonCoords(ctx: CanvasRenderingContext2D, finalizer: Finalizer, m: vec2[][][]) {
    return m.map(p => drawPolygonCoords(ctx, finalizer, p))
}



function translateAlong(v0: vec3, v1: vec3, a: number) {
    const along = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), v1, v0))
    const v = scalarMul3(along, a)

    return vec3.add(vec3.create(), v0, v)
}


function main() {
    const height = window.innerHeight * 0.3;
    const width = window.innerWidth * 0.3;
    // const cam = vec3.fromValues(149434 , 169456 - 10, 100 - 5)
    const v = vec3.fromValues(149470.383945, 169445.318499, 80)
    const viewport = vec2.fromValues(width, height)
    // const multi = solid.coordinates as n3[][];
    // const transformed = getMultiPolygonCoords(viewport, cam, v, multi)

    // const transformed = getPolygonCoords(viewport, cam, v, multi)


    let movingCam = v
    let movingV = v

    const renderFrame =
        (ctx: CanvasRenderingContext2D) => () => {
            const ts = performance.now()
            console.group('Frame')
            // console.log('start', ts)
            ctx.clearRect(0, 0, width, height)
            // dbg()
            ctx.fillStyle = "rgba(255,0,0,0)"
            data.features.forEach((f) => {
                const mt = getPolygonCoords(viewport, movingCam, movingV, f.geometry.coordinates as n3[][])
                // const mt = getPolygonCoords(viewport, movingCam, v, multi)
                drawPolygonCoords(ctx, c => { c.fill(), c.stroke() }, mt)
            })
            ctx.save()
            ctx.fillStyle = "rgba(0,255,33,0.1)"
            data2.features.forEach((f) => {
                const mt = getPolygonCoords(viewport, movingCam, movingV, f.geometry.coordinates as n3[][])
                drawPolygonCoords(ctx, c => { c.closePath(), c.stroke(); c.fill() }, mt)
            })
            ctx.restore()

            DEBUG = true;
            const [cx, cy] = getPointViewCoord(viewport, movingCam, movingV, movingV)
            DEBUG = false;
            const [cx0, cy0] = getPointViewCoord(viewport, movingCam, movingV,
                vec3.fromValues(movingV[0], movingV[1], movingV[2] - 20))
            ctx.save()
            ctx.strokeStyle = 'blue'
            ctx.beginPath()
            ctx.moveTo(cx0, cy0)
            ctx.lineTo(cx, cy)
            ctx.stroke()

            ctx.strokeStyle = 'red'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(cx - 10, cy)
            ctx.lineTo(cx + 10, cy)
            ctx.moveTo(cx, cy - 10)
            ctx.lineTo(cx, cy + 10)
            ctx.stroke()
            ctx.restore()
            // console.log('end', performance.now() - ts)
            console.groupEnd()

        }

    const scale = 30

    const cs = [
        {
            canvas: document.createElement('canvas'),
            vec: vec3.fromValues(v[0], v[1] - scale, v[2] + scale)
        },
        {
            canvas: document.createElement('canvas'),
            vec: vec3.fromValues(v[0] - scale, v[1], v[2] + scale)
        },
        {
            canvas: document.createElement('canvas'),
            vec: vec3.fromValues(v[0], v[1] + scale, v[2] + scale)
        },
        {
            canvas: document.createElement('canvas'),
            vec: vec3.fromValues(v[0] + scale, v[1], v[2] + scale)
        },
        {
            canvas: document.createElement('canvas'),
            vec: vec3.fromValues(v[0] + scale, v[1] - scale, v[2] + scale)
        },
    ];

    cs.forEach(({ canvas, vec }, idx) => {

        // const canvas = document.createElement('canvas')
        canvas.setAttribute('width', width.toFixed())
        canvas.setAttribute('height', height.toFixed())
        const context = canvas.getContext('2d')
        document.body.appendChild(canvas);

        const camdbg = document.createElement('div')
        const targetdbg = document.createElement('div')
        document.body.appendChild(camdbg)
        document.body.appendChild(targetdbg)

        movingCam = vec

        const dbg = () => {
            camdbg.innerHTML = `Camera: ${vts(movingCam)}`
            targetdbg.innerHTML = `Target: ${vts(movingV)}`
        }


        if (context) {
            // context.scale(1, -1)
            // context.translate(0, -height)
            context.strokeStyle = '#666'
            context.lineWidth = 0.5

            const render = renderFrame(context)

            // const up = document.createElement('div')
            // up.innerHTML = 'up'
            // document.body.appendChild(up)
            // up.addEventListener('click', () => {
            //     // movingCam = rotateAround(movingV, movingCam, d2r(1), xAxis)
            //     movingCam = vec3.rotateX(vec3.create(), movingCam, movingV, d2r(5))
            //     render()
            // })
            // const down = document.createElement('div')
            // down.innerHTML = 'down'
            // document.body.appendChild(down)
            // down.addEventListener('click', () => {
            //     // movingCam = rotateAround(movingV, movingCam, d2r(-1), xAxis)
            //     movingCam = vec3.rotateX(vec3.create(), movingCam, movingV, d2r(-5))
            //     render()
            // })

            // const right = document.createElement('div')
            // right.innerHTML = 'right'
            // document.body.appendChild(right)
            // right.addEventListener('click', () => {
            //     movingCam = vec3.rotateZ(vec3.create(), movingCam, movingV, d2r(-5))
            //     render()
            // })

            // const left = document.createElement('div')
            // left.innerHTML = 'left'
            // document.body.appendChild(left)
            // left.addEventListener('click', () => {
            //     movingCam = vec3.rotateZ(vec3.create(), movingCam, movingV, d2r(5))
            //     render()
            // })


            // const near = document.createElement('div')
            // near.innerHTML = 'near'
            // document.body.appendChild(near)
            // near.addEventListener('click', () => {
            //     movingCam = translateAlong(movingCam, movingV, 20)
            //     render()
            // })

            // const far = document.createElement('div')
            // far.innerHTML = 'far'
            // document.body.appendChild(far)
            // far.addEventListener('click', () => {
            //     movingCam = translateAlong(movingCam, movingV, -20)
            //     render()
            // })

            render()


            // const it = setInterval(() => {
            //     movingCam = vec3.rotateZ(vec3.create(), movingCam, movingV, d2r(.5))
            //     // vec3.rotateX(movingCam, movingCam, movingV, d2r(-.1))
            //     render()
            // }, 30)

            // const stop = document.createElement('div')
            // stop.innerHTML = 'STOP'
            // document.body.appendChild(stop)
            // stop.addEventListener('click', () => clearInterval(it))
        }

    })
}

document.onreadystatechange = () => {
    if ('interactive' === document.readyState) {
        main()
    }
}
