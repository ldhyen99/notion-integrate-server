const handler = async (req, res) => {
    try {
      // Kiểm tra trạng thái server
      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: "Notion API Server is running smoothly!",
      };
  
      res.status(200).json(healthStatus);
    } catch (error) {
      console.error("Health check failed:", error.message);
      res.status(500).json({
        status: "unhealthy",
        message: "Health check failed",
        error: error.message,
      });
    }
  };
  
  module.exports = handler;
  