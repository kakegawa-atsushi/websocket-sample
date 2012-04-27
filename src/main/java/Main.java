import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.HandlerList;
import org.eclipse.jetty.server.handler.ResourceHandler;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * アプリケーション実行クラスです。
 */
public class Main {
    
    /** logger */
    private static final Logger LOGGER = LoggerFactory.getLogger(Main.class);

    /**
     * メインメソッドです。
     * 
     * @param args
     */
    public static void main(String[] args) {
        // 8080ポートをリスンするサーバーを作成
        Server server = new Server(8080);
//        Server server = new Server(Integer.valueOf(System.getenv("PORT")));
        
        // Webコンテナ機能のハンドラを作成
        ResourceHandler resourceHandler = new ResourceHandler();
        // 静的コンテンツの配置ディレクトリを指定
        resourceHandler.setResourceBase("./webapp");
        
        // サーブレットコンテナ機能のハンドラを作成
        ServletContextHandler contextHandler = new ServletContextHandler(ServletContextHandler.SESSIONS);
        contextHandler.setContextPath("/");
        // WebSocketでクライアントと接続するサーブレットを追加
        contextHandler.addServlet(new ServletHolder(new PlayerWebSocketServlet()), "/note");
        // サーブレットコンテキストリスナを追加
        ApplicationServletContextListener contextListener = new ApplicationServletContextListener();
        contextHandler.addEventListener(contextListener);
        
        // サーバーにハンドラをセット
        HandlerList handlers = new HandlerList();
        handlers.setHandlers(new Handler[] { resourceHandler, contextHandler });
        server.setHandler(handlers);
        
        // サーバーを起動
        try {
            server.start();
            server.join();
        } catch (InterruptedException e) {
            LOGGER.error(e.getMessage());
        } catch (Exception e) {
            LOGGER.error(e.getMessage());
        }
    }

}
