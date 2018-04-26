function moveCar(carNum, s, a, footbreak, bump) {
    var params = [];
    params[0] = parseFloat(s);
    params[1] = parseFloat(a);
    params[2] = parseFloat(footbreak);
    params[3] = parseFloat(bump);

    var dataStruct =
      + params[0] + ","
      + params[1] + ","
      + params[2] + ","
      + params[3];
    console.log("CarNum: " + carNum);

    gameInstance.SendMessage('Vehicle-' + carNum, 'MoveVehicle', dataStruct);
  }
