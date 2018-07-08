import { vec3, mat3, mat4 } from 'gl-matrix';

const VIEW_X = 0
const VIEW_Y = 2
const VIEW_Z = 1


function scalarDiv(a: vec3, s: number) {
    return vec3.fromValues(a[0] / s, a[1] / s, a[2] / s)
}
function scalarMul(a: vec3, s: number) {
    return vec3.fromValues(a[0] * s, a[1] * s, a[2] * s)
}
function scalarAdd(a: vec3, s: number) {
    return vec3.fromValues(a[0] + s, a[1] + s, a[2] + s)
}


function drawPoint(cam: vec3, v: vec3, field: number, pt: vec3) {
    const angle = vec3.angle(cam, v)
    const m = mat4.fromRotation(mat4.create(), angle, v)
    const tcam = vec3.transformMat4(vec3.create(), cam, m)
    const tpt = vec3.transformMat4(vec3.create(), pt, m)

    const dist = vec3.dist(tcam, v)
    const pv = vec3.sub(vec3.create(), v, tcam)
    const npv = vec3.normalize(vec3.create(), pv)
}