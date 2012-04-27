import javax.servlet.http.HttpServletRequest;

import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocketServlet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * WebSocketでの接続を行うサーブレットクラスです。
 */
public class PlayerWebSocketServlet extends WebSocketServlet {

    private static final long serialVersionUID = -2160560378516583873L;
    
    /** logger */
    private static final Logger LOGGER = LoggerFactory.getLogger(PlayerWebSocketServlet.class);

    @Override
    public WebSocket doWebSocketConnect(HttpServletRequest request, String protocol) {
        // サーブレット内の処理で利用するWebSocketのファクトリメソッド
        // WebSocketインターフェースの実装クラスのインスタンスを生成して返す
        
        // クライアントIDとしてセッションIDを利用
        String sessionId = request.getSession().getId();
        LOGGER.info(String.format("doWebSocketConnect - sessionID:%s", sessionId));
        
        // WebSocketインターフェースの実装クラスのインスタンスを生成
        PlayerManager manager = (PlayerManager) getServletContext().getAttribute("playerManager");
        PlayerWebSocket webSocket = new PlayerWebSocket(manager, sessionId);
        
        return webSocket;
    }

}
