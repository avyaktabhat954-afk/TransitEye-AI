const vehicleDensityService = require("../services/vehicleDensityService");
const { validateVehicleDensityQuery } = require("../middleware/validateQuery");

/**
 * Controller for handling vehicle density HTTP requests.
 */

exports.createVehicleDensity = async (req, res, next) => {
  try {
    const created = await vehicleDensityService.createVehicleDensity(req.body);
    return res.status(201).json({
      success: true,
      message: "Vehicle density record accepted and recorded",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

exports.getVehicleDensity = async (req, res, next) => {
  try {
    const { errors, options } = validateVehicleDensityQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors,
      });
    }

    const records = await vehicleDensityService.getAllVehicleDensity(options);
    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
      pagination: {
        total: records.total !== undefined ? records.total : records.length,
        limit: records.limit !== undefined ? records.limit : options.limit,
        offset: records.offset !== undefined ? records.offset : options.offset,
      },
    });
  } catch (error) {
    next(error);
  }
};
