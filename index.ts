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

const vts2 = (v: vec2) => `vec2(${v[0]},${v[1]})`
const vts = (v: vec3) => `vec3(${v[0].toFixed(0)},${v[1].toFixed(0)},${v[2].toFixed(0)})`


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
    // console.log("Target", vts(target))


    // 1 - get matrix to translate camera to origin and tranform everything with it
    const toOrigin = mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), cam))
    const target0 = vec3.sub(vec3.create(), target, cam)//vec3.transformMat4(vec3.create(), target, toOrigin)
    const pt0 = vec3.sub(vec3.create(), pt, cam)//vec3.transformMat4(vec3.create(), pt, toOrigin)

    // console.log("ToOrigin", vts(target0))

    // 2 - get vector from camera to target CT
    // const CT = vec3.normalize(vec3.create(), vec3.negate(vec3.create(), target0))
    const CT = target0

    // 3 - get rotation to align CT  on (0,0,1), and build a matrix with it 
    const targetProjectedOnZY = vec2.fromValues(CT[2], CT[1])
    const targetProjectedOnZX = vec2.fromValues(CT[2], CT[0])
    const xangle = vec2.equals([0, 0], targetProjectedOnZX) ? 0 : angle2(vec2.fromValues(1, 0), targetProjectedOnZX)
    const yangle = vec2.equals([0, 0], targetProjectedOnZY) ? 0 : angle2(vec2.fromValues(1, 0), targetProjectedOnZY)
    const rotMatX = mat4.fromRotation(mat4.create(), yangle, xAxis)
    const rotMatZ = mat4.fromRotation(mat4.create(), xangle, yAxis)
    const rotMat = mat4.mul(mat4.create(), rotMatX, rotMatZ)
    // const angle = vec3.angle(CT, zAxis)
    // const normal = vec3.cross(vec3.create(), zAxis, CT)
    // const rotMat = mat4.fromRotation(mat4.create(), -angle, normal)



    const ptRot = rotMat === null ?
        pt0 :
        vec3.transformMat4(vec3.create(), pt0, rotMat)

    if (DEBUG) {
        console.log("Target0 ", target0[0], target0[1], target0[2])
        console.log('ProjectedOnZX', targetProjectedOnZX[0], targetProjectedOnZX[1])
        console.log('ProjectedOnZY', targetProjectedOnZY[0], targetProjectedOnZY[1])
        console.log(`xangle = angle([1, 0], ${vts2(targetProjectedOnZX)}) => ${r2d(xangle)}`)
        console.log(`yangle = angle([1, 0], ${vts2(targetProjectedOnZY)}) => ${r2d(yangle)}`)
        // console.log('IsRotated', rotMat !== null)
        const a = vec3.transformMat4(vec3.create(), pt0, rotMatX)
        console.log('a', vts(a))
        // assert(a[1] === 0, `Y: ${a[1]} !== 0`)
        const b = vec3.transformMat4(vec3.create(), a, rotMatZ)
        // assert(b[0] === 0, `X: ${b[0]} !== 0`)
        console.log('b', vts(b))
        const rotTarget = rotMat === null ?
            target0 :
            vec3.transformMat4(vec3.create(), target0, rotMat)
        console.log("Rotated", vts(rotTarget))
    }

    // 4 - drop Zs
    let pt2 = vec2.fromValues(ptRot[0], ptRot[1])

    // 4.5 - scaling
    const dist = vec3.dist(cam, target);
    pt2 = scalarMul2(pt2, viewport[0] / dist)

    // 5 - get a translation mat3 that translate cam to viewport center and translate point with it
    const toCenter = mat3.fromTranslation(mat3.create(), scalarDiv2(viewport, 2))
    const ret = vec2.transformMat3(vec2.create(), pt2, toCenter)

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
    const height = window.innerHeight * 0.8;
    const width = window.innerWidth * 0.6;
    const cam = vec3.fromValues(149434, 169456 + 20, 100)
    const v = vec3.fromValues(149434, 169456, 100)
    const viewport = vec2.fromValues(width, height)
    // const multi = solid.coordinates as n3[][];
    // const transformed = getMultiPolygonCoords(viewport, cam, v, multi)

    // const transformed = getPolygonCoords(viewport, cam, v, multi)


    const canvas = document.createElement('canvas')
    canvas.setAttribute('width', width.toFixed())
    canvas.setAttribute('height', height.toFixed())
    const context = canvas.getContext('2d')
    document.body.appendChild(canvas);

    const camdbg = document.createElement('div')
    const targetdbg = document.createElement('div')
    document.body.appendChild(camdbg)
    document.body.appendChild(targetdbg)



    let movingCam = cam
    let movingV = v

    const dbg = () => {
        camdbg.innerHTML = `Camera: ${vts(movingCam)}`
        targetdbg.innerHTML = `Target: ${vts(movingV)}`
    }

    const renderFrame =
        (ctx: CanvasRenderingContext2D) => () => {
            const ts = performance.now()
            console.group('Frame')
            console.log('start', ts)
            ctx.clearRect(0, 0, width, height)
            dbg()
            data.features.forEach((f) => {
                const mt = getPolygonCoords(viewport, movingCam, movingV, f.geometry.coordinates as n3[][])
                // const mt = getPolygonCoords(viewport, movingCam, v, multi)
                drawPolygonCoords(ctx, c => c.stroke(), mt)
            })
            ctx.save()
            ctx.fillStyle = "blue"
            data2.features.forEach((f) => {
                const mt = getPolygonCoords(viewport, movingCam, movingV, f.geometry.coordinates as n3[][])
                drawPolygonCoords(ctx, c => { c.stroke(); c.fill() }, mt)
            })
            ctx.restore()

            DEBUG = true;
            const [cx, cy] = getPointViewCoord(viewport, movingCam, movingV, movingV)
            ctx.save()
            ctx.strokeStyle = 'red'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(cx - 10, cy)
            ctx.lineTo(cx + 10, cy)
            ctx.moveTo(cx, cy - 10)
            ctx.lineTo(cx, cy + 10)
            ctx.stroke()
            ctx.restore()
            DEBUG = false;
            console.log('end', performance.now() - ts)
            console.groupEnd()

        }

    if (context) {
        // context.scale(1, -1)
        // context.translate(0, -height)
        context.strokeStyle = '#666'
        context.lineWidth = 0.5

        const render = renderFrame(context)

        const up = document.createElement('div')
        up.innerHTML = 'up'
        document.body.appendChild(up)
        up.addEventListener('click', () => {
            // movingCam = rotateAround(movingV, movingCam, d2r(1), xAxis)
            movingCam = vec3.rotateX(vec3.create(), movingCam, movingV, d2r(5))
            render()
        })
        const down = document.createElement('div')
        down.innerHTML = 'down'
        document.body.appendChild(down)
        down.addEventListener('click', () => {
            // movingCam = rotateAround(movingV, movingCam, d2r(-1), xAxis)
            movingCam = vec3.rotateX(vec3.create(), movingCam, movingV, d2r(-5))
            render()
        })

        const right = document.createElement('div')
        right.innerHTML = 'right'
        document.body.appendChild(right)
        right.addEventListener('click', () => {
            movingCam = vec3.rotateY(vec3.create(), movingCam, movingV, d2r(-5))
            render()
        })

        const left = document.createElement('div')
        left.innerHTML = 'left'
        document.body.appendChild(left)
        left.addEventListener('click', () => {
            movingCam = vec3.rotateY(vec3.create(), movingCam, movingV, d2r(5))
            render()
        })


        const near = document.createElement('div')
        near.innerHTML = 'near'
        document.body.appendChild(near)
        near.addEventListener('click', () => {
            movingCam = translateAlong(movingCam, movingV, 20)
            render()
        })

        const far = document.createElement('div')
        far.innerHTML = 'far'
        document.body.appendChild(far)
        far.addEventListener('click', () => {
            movingCam = translateAlong(movingCam, movingV, -20)
            render()
        })

        render()



        const it = setInterval(() => {
            movingCam = vec3.rotateZ(vec3.create(), movingCam, movingV, d2r(.5))
            // vec3.rotateX(movingCam, movingCam, movingV, d2r(-.1))
            render()
        }, 30)

        const stop = document.createElement('div')
        stop.innerHTML = 'STOP'
        document.body.appendChild(stop)
        stop.addEventListener('click', () => clearInterval(it))
    }

}

document.onreadystatechange = () => {
    if ('interactive' === document.readyState) {
        main()
    }
}
