const detectionService = require("../services/detectionService");
const { validateDetectionQuery } = require("../middleware/validateQuery");

/**
 * Controller for handling detection HTTP requests.
 */

exports.createDetection = async (req, res, next) => {
  try {
    const created = await detectionService.createDetection(req.body);
    return res.status(201).json({
      success: true,
      message: "Detection accepted and recorded",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDetections = async (req, res, next) => {
  try {
    const { errors, options } = validateDetectionQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors,
      });
    }

    const detections = await detectionService.getAllDetections(options);
    return res.status(200).json({
      success: true,
      count: detections.length,
      data: detections,
      pagination: {
        total: detections.total !== undefined ? detections.total : detections.length,
        limit: detections.limit !== undefined ? detections.limit : options.limit,
        offset: detections.offset !== undefined ? detections.offset : options.offset,
      },
    });
  } catch (error) {
    next(error);
  }
};
