const vehicleDensityService = require("../services/vehicleDensityService");

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
    const records = await vehicleDensityService.getAllVehicleDensity();
    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};
