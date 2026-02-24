import { useEffect, useState, useRef, useCallback } from 'react'
import type { Requirement } from '../../models/Requirement'
import { WS_ENDPOINTS } from '../../config/api'

interface WebSocketMessage {
    event: 'initial_state' | 'requirement_created' | 'requirement_updated'
    requirements?: Requirement[]
    requirement?: Requirement
    requirement_id?: string
    version_id?: string
    diff?: Record<string, { before: any; after: any }>
}

const MAX_RETRIES = 5
const HEARTBEAT_INTERVAL = 15000 // 15s

/**
 * WebSocket 同步 Hook —— 订阅项目级需求变更
 *
 * 替代 REST 轮询，提供实时 requirements 列表。
 * 当 WebSocket 还未建立或 projectId 为空时，requirements 为 []。
 */
export function useProjectSync(projectId: string | undefined) {
    const [requirements, setRequirements] = useState<Requirement[]>([])
    const [isConnected, setIsConnected] = useState(false)

    const wsRef = useRef<WebSocket | null>(null)
    const retryCountRef = useRef(0)
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // 最新的 requirements 引用，供回调闭包读取
    const requirementsRef = useRef<Requirement[]>([])
    requirementsRef.current = requirements

    // 清理资源的通用函数
    const cleanup = useCallback(() => {
        if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current)
            heartbeatTimerRef.current = null
        }
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current)
            retryTimerRef.current = null
        }
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
        setIsConnected(false)
    }, [])

    useEffect(() => {
        if (!projectId) {
            cleanup()
            setRequirements([])
            return
        }

        function connect() {
            const token = localStorage.getItem('token') || ''
            const url = `${WS_ENDPOINTS.projectSync(projectId!)}${token ? `?token=${token}` : ''}`
            console.log(`🔗 [WS] 正在连接: ${url}`)
            console.log(`🔗 [WS] projectId=${projectId}, token=${token ? token.substring(0, 20) + '...' : '(空)'}`)
            const ws = new WebSocket(url)
            wsRef.current = ws

            ws.onopen = () => {
                console.log(`✅ [WS] 连接已建立, readyState=${ws.readyState}, protocol='${ws.protocol}'`)
                setIsConnected(true)
                retryCountRef.current = 0

                // 心跳保活
                heartbeatTimerRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }))
                    }
                }, HEARTBEAT_INTERVAL)
            }

            ws.onmessage = (event) => {
                console.log(`📩 [WS] 收到原始消息 (type=${typeof event.data}, length=${String(event.data).length}):`, event.data)
                try {
                    const msg: WebSocketMessage = JSON.parse(event.data)
                    console.log(`📩 [WS] 解析后事件: event=${msg.event}`, msg)

                    switch (msg.event) {
                        case 'initial_state':
                            setRequirements(msg.requirements || [])
                            console.log(`📦 [WS] 已同步 ${msg.requirements?.length ?? 0} 条需求`)
                            break

                        case 'requirement_created':
                            if (msg.requirement) {
                                setRequirements(prev => [...prev, msg.requirement!])
                                console.log(`➕ [WS] 新需求: ${msg.requirement.id}`)
                            }
                            break

                        case 'requirement_updated':
                            if (msg.requirement_id && msg.diff) {
                                setRequirements(prev =>
                                    prev.map(req => {
                                        if (req.id !== msg.requirement_id) return req
                                        const updated = { ...req }
                                        Object.keys(msg.diff!).forEach(field => {
                                            ; (updated as any)[field] = msg.diff![field].after
                                        })
                                        return updated
                                    })
                                )
                                console.log(`🔄 [WS] 需求已更新: ${msg.requirement_id}，变更字段: ${Object.keys(msg.diff).join(', ')}`)
                            }
                            break

                        default:
                            console.warn(`⚠️ [WS] 未知事件类型: ${(msg as any).event}`, msg)
                    }
                } catch (err) {
                    console.error('❌ [WS] 消息解析失败:', err, '原始数据:', event.data)
                }
            }

            ws.onerror = (error) => {
                console.error('❌ [WS] 错误:', error)
                console.error(`❌ [WS] 当前 readyState=${ws.readyState}`)
            }

            ws.onclose = (event) => {
                console.log(`🔌 [WS] 连接关闭: code=${event.code}, reason='${event.reason}', wasClean=${event.wasClean}`)
                setIsConnected(false)

                if (heartbeatTimerRef.current) {
                    clearInterval(heartbeatTimerRef.current)
                    heartbeatTimerRef.current = null
                }

                // 断线重连（指数退避）
                if (retryCountRef.current < MAX_RETRIES) {
                    retryCountRef.current++
                    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
                    console.log(`🔄 [WS] ${delay}ms 后重连 (${retryCountRef.current}/${MAX_RETRIES})`)
                    retryTimerRef.current = setTimeout(connect, delay)
                } else {
                    console.error('❌ [WS] 达到最大重连次数，停止重连')
                }
            }
        }

        connect()

        return cleanup
    }, [projectId, cleanup])

    return { requirements, isConnected }
}
