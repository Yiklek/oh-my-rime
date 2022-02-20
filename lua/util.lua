local M = {}
local function get_local_require(prefix)
    return function(module)
        return require(prefix..'.'..module)
    end
end
M.get_local_require = get_local_require
return M
