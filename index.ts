import { vec3, mat3, mat4, vec2 } from 'gl-matrix';
import { data } from './data';


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

function scalarAdd(a: vec3, s: number) {
    return vec3.fromValues(a[0] + s, a[1] + s, a[2] + s)
}

type n3 = [number, number, number];

const vts = (v: vec3) => `vec3(${v[0]},${v[1]},${v[2]})`


function getPointViewCoord(viewport: vec2, cam: vec3, target: vec3, pt: vec3) {
    console.log("Target", vts(target))


    // 1 - get matrix to translate camera to origin and tranform everything with it
    const toOrigin = mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), cam))
    const cam0 = vec3.transformMat4(vec3.create(), cam, toOrigin)
    const target0 = vec3.transformMat4(vec3.create(), target, toOrigin)
    const pt0 = vec3.transformMat4(vec3.create(), pt, toOrigin)

    console.log("ToOrigin", vts(target0))

    // 2 - get vector from camera to target CT
    const CT = target0

    // 3 - get rotation to align CT  on (0,0,1), and build a matrix with it 
    const v001 = vec3.fromValues(0, 0, 1)
    const angle = vec3.angle(v001, CT)
    const normal = vec3.cross(vec3.create(), v001, CT)
    const rotMat = mat4.fromRotation(mat4.create(), angle, normal)

    const ptRot = rotMat === null ?
        pt0 :
        vec3.transformMat4(vec3.create(), pt0, rotMat)

    const rotTarget = rotMat === null ?
        target0 :
        vec3.transformMat4(vec3.create(), target0, rotMat)

    console.log("Rotated", vts(rotTarget))

    // 4 - drop Zs
    let pt2 = vec2.fromValues(ptRot[0], ptRot[1])

    // 4.5 - for debugging
    pt2 = scalarMul2(pt2, 5)

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

function drawLineRingCoord(ctx: CanvasRenderingContext2D, lr: vec2[]) {
    const start = lr[0]
    ctx.beginPath()
    ctx.moveTo(start[0], start[1])
    lr.slice(1).forEach(pt => ctx.lineTo(pt[0], pt[1]))
    ctx.stroke()
}

function drawPolygonCoords(ctx: CanvasRenderingContext2D, p: vec2[][]) {
    return p.map(lr => drawLineRingCoord(ctx, lr))
}

function drawMultiPolygonCoords(ctx: CanvasRenderingContext2D, m: vec2[][][]) {
    return m.map(p => drawPolygonCoords(ctx, p))
}


function main() {
    const height = window.innerHeight * 0.6;
    const width = window.innerWidth * 0.6;
    const cam = vec3.fromValues(149434, 169456, 80)
    const v = vec3.fromValues(149434, 169456, 90)
    const viewport = vec2.fromValues(width, height)
    // const multi = solid.coordinates as n3[][];
    // const transformed = getMultiPolygonCoords(viewport, cam, v, multi)

    // const transformed = getPolygonCoords(viewport, cam, v, multi)


    const canvas = document.createElement('canvas')
    canvas.setAttribute('width', width.toFixed())
    canvas.setAttribute('height', height.toFixed())
    const context = canvas.getContext('2d')
    document.body.appendChild(canvas);

    let movingCam = cam
    let movingV = v
    const renderFrame =
        (ctx: CanvasRenderingContext2D) => () => {
            ctx.clearRect(0, 0, width, height)
            movingCam = vec3.fromValues(movingCam[0], movingCam[1] - 1, movingCam[2])
            movingV = vec3.fromValues(movingV[0], movingV[1], movingV[2])
            data.features.forEach((f) => {
                const mt = getPolygonCoords(viewport, movingCam, movingV, f.geometry.coordinates as n3[][])
                // const mt = getPolygonCoords(viewport, movingCam, v, multi)
                drawPolygonCoords(ctx, mt)
            })
        }

    if (context) {
        context.scale(1, -1)
        context.translate(0, -height)
        context.strokeStyle = '#666'
        context.lineWidth = 0.5

        // drawMultiPolygonCoords(context, transformed)
        // drawPolygonCoords(context, transformed)
        const it = setInterval(renderFrame(context), 100)
        // renderFrame(context)()

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
