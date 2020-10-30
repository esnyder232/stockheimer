class ValidFuncs {
	constructor() {}

	validateUsername(username) 
	{
		var bError = false;
		var results = "";

		if(username == "")
		{
			bError = true;
		}

		//check the username length
		if(!bError && username.length <= 0 || username.length > 32)
		{
			bError = true;
		}

		//if the username did not meet the requirements, return the error response
		if(bError)
		{
			results = `The username did not meet the requirements: the length must be between 1-32 characters and cannot be blank.`;
		}
		else
		{
			results = "success";
		}

		return results;
	}
}

exports.ValidFuncs = new ValidFuncs();