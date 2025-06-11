const Statistics = require('../models/Statistics');

const statisticsController = {
  getChatVolumeStats: async (req, res) => {
    try {
      // Basic validation/sanitization of query params would be good here
      const filters = {
        startDate: req.query.startDate, // Expects 'YYYY-MM-DD'
        endDate: req.query.endDate,     // Expects 'YYYY-MM-DD'
        agentId: req.query.agentId ? parseInt(req.query.agentId) : undefined,
        whatsappAccountId: req.query.whatsappAccountId ? parseInt(req.query.whatsappAccountId) : undefined,
      };
      const data = await Statistics.getChatVolume(filters);
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching chat volume statistics:', error);
      res.status(500).json({ message: 'Failed to fetch chat volume statistics.', error: error.message });
    }
  },

  getClosureTypeStats: async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        agentId: req.query.agentId ? parseInt(req.query.agentId) : undefined,
        whatsappAccountId: req.query.whatsappAccountId ? parseInt(req.query.whatsappAccountId) : undefined,
      };
      const data = await Statistics.getClosureTypes(filters);
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching closure type statistics:', error);
      res.status(500).json({ message: 'Failed to fetch closure type statistics.', error: error.message });
    }
  },

  getAgentPerformanceStats: async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };
      // Note: agentId and whatsappAccountId are not typically used for overall agent performance comparison directly,
      // but could be if we wanted to see performance of one agent on one account.
      // The model's getAgentPerformance doesn't use these currently.
      const data = await Statistics.getAgentPerformance(filters);
      res.status(200).json(data);
    } catch (error)
    {
      console.error('Error fetching agent performance statistics:', error);
      res.status(500).json({ message: 'Failed to fetch agent performance statistics.', error: error.message });
    }
  }
};

module.exports = statisticsController;
