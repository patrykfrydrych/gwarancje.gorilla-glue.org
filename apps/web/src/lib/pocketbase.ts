import PocketBase from 'pocketbase'

const baseUrl = import.meta.env.VITE_PB_URL ?? 'http://127.0.0.1:8090'
const pb = new PocketBase(baseUrl)

pb.autoCancellation(false)

export { baseUrl, pb }
