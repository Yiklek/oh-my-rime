local local_require = require('util').get_local_require("wubi98")
local basic = local_require('lib/basic')
local map = basic.map
local index = basic.index
local utf8chars = basic.utf8chars
local matchstr = basic.matchstr

local function SubStringGetByteCount(str, index)
	local curByte = string.byte(str, index)
	local byteCount = 1;
	if curByte == nil then
		byteCount = 0
	elseif curByte > 0 and curByte <= 127 then
		byteCount = 1
	elseif curByte>=192 and curByte<=223 then
		byteCount = 2
	elseif curByte>=224 and curByte<=239 then
		byteCount = 3
	elseif curByte>=240 and curByte<=247 then
		byteCount = 4
	end
	return byteCount;
end

-- 获取中英混合UTF8字符串的真实字符数量
local function SubStringGetTotalIndex(str)
	local curIndex = 0;
	local i = 1;
	local lastCount = 1;
	repeat
		lastCount = SubStringGetByteCount(str, i)
		i = i + lastCount;
		curIndex = curIndex + 1;
	until(lastCount == 0);
	return curIndex - 1;
end

local function xform(input)
	if input == "" then return "" end
	input = input:gsub('%[', '〔')
	input = input:gsub('%]', '〕')
	input = input:gsub('※', ' ')
	input = input:gsub('_', ' ')
	input = input:gsub(',', '·')
	return input
end

local function subspelling(str, ...)
	local first, last = ...
	if not first then return str end
	local radicals = {}
	local s = str
	s = s:gsub('{', ' {')
	s = s:gsub('}', '} ')
	for seg in s:gmatch('%S+') do
		if seg:find('^{.+}$') then
			table.insert(radicals, seg)
		else
			for pos, code in utf8.codes(seg) do
				table.insert(radicals, utf8.char(code))
			end
		end
	end
	return table.concat{ table.unpack(radicals, first, last) }
end

local function lookup(db)
	return function (str)
		return db:lookup(str)
	end
end

local function parse_spll(str)
	local s = string.gsub(str, ',.*', '')
	return string.gsub(s, '^%[', '')
end

local function spell_phrase(s, spll_rvdb)
	local chars = utf8chars(s)
	local rvlk_results
	if #chars == 2 or #chars == 3 then
		rvlk_results = map(chars, lookup(spll_rvdb))
	else
		rvlk_results = map({chars[1], chars[2], chars[3], chars[#chars]},
				lookup(spll_rvdb))
	end
	if index(rvlk_results, '') then return '' end
	local spellings = map(rvlk_results, parse_spll)
	local sup = '◇'
	if #chars == 2 then
		return subspelling(spellings[1] .. sup, 2, 2) ..
					 subspelling(spellings[1] .. sup, 4, 4) ..
					 subspelling(spellings[2] .. sup, 2, 2) ..
					 subspelling(spellings[2] .. sup, 4, 4)
	elseif #chars == 3 then
		return subspelling(spellings[1], 2, 2) ..
					 subspelling(spellings[2], 2, 2) ..
					 subspelling(spellings[3] .. sup, 2, 2) ..
					 subspelling(spellings[3] .. sup, 4, 4)
	else
		return subspelling(spellings[1], 2, 2) ..
					 subspelling(spellings[2], 2, 2) ..
					 subspelling(spellings[3], 2, 2) ..
					 subspelling(spellings[4], 2, 2)
	end
end

local function get_tricomment(cand, env)
	local ctext = cand.text
	if utf8.len(ctext) == 1 then
		local spll_raw = env.spll_rvdb:lookup(ctext)
		if spll_raw ~= '' then
			if env.engine.context:get_option("new_hide_pinyin") then
			-- return xform(spll_raw:gsub('%[(.-,.-),.+%]', '[%1]'))
				 return xform(spll_raw:gsub('%[(.-),.+%]', '[%1]'))
			else
				return xform(spll_raw)
			end
		end
	else
		local spelling = spell_phrase(ctext, env.spll_rvdb)
		if spelling ~= '' then
			spelling = spelling:gsub('{(.-)}', '<%1>')
			local code = env.code_rvdb:lookup(ctext)
			if code ~= '' then
				code = matchstr(code, '%S+')
				table.sort(code, function(i, j) return i:len() < j:len() end)
				code = table.concat(code, ' ')
				return '〔 ' .. spelling .. ' · ' .. code .. ' 〕'
			else
				return '〔 ' .. spelling .. ' 〕'
			end
		end
	end
	return ''
end

local function filter(input, env)
	local codetext=env.engine.context.input  -- 获取编码
	local script_text=env.engine.context:get_script_text()
	local hide_pinyin=env.engine.context:get_option("new_hide_pinyin")
	-- 获取输入法常用参数
	-- env.engine.context:get_commit_text() -- filter中为获取编码
	-- env.engine.context:get_script_text()-- 获取编码带引导符
	-- local caret_pos = env.engine.context.caret_pos          - 光标的位置通常可以理解为单字节编码长度
	-- local schema = env.engine.schema.config:get_int('menu/page_size')         -- 获取方案候选项数目参数
	-- local ascii_mode=env.engine.context:get_option("ascii_mode")  -- env.engine.context:set_option("ascii_mode", not ascii_mode)
	-- local schema_id=env.engine.schema.schema_id         -- 获取方案id
	-- local schema_name=env.engine.schema.schema_name         -- 获取方案名称
	-- local sync_dir=rime_api.get_sync_dir()         -- 获取同步资料目录
	-- local rime_version=rime_api.get_rime_version()         -- 获取rime版本号--macos无效
	-- local shared_data_dir=rime_api.get_shared_data_dir()         -- 获取程序目录data路径
	-- local user_data_dir=rime_api.get_user_data_dir()         -- 获取用户目录路径
	if env.engine.context:get_option("new_spelling") then
		for cand in input:iter() do
			if cand.type == 'simplified' and env.name_space == 'new_for_rvlk' then
				if cand.comment=="" then
					local comment = get_tricomment(cand, env)
					yield(Candidate("simp_rvlk", cand.start, cand._end, cand.text, comment))
				end
			else
				if script_text:find("^[a-z]*([%`])[a-z%`]*") and not script_text:find("%p$") or script_text:find("^z[a-z]*") and not script_text:find("%p$") or script_text:find("^([%/])[a-z]*") and not script_text:find("%p$") then
					-- cand.quality=10  -- 调整权值 "💡"   cand.type:'reverse_lookup'
					local add_comment=get_tricomment(cand, env)
					local code_comment=env.code_rvdb:lookup(cand.text)
					if add_comment~=nil or add_comment~="" then
						if cand.comment == "" then
							yield(Candidate("simp_rvlk", cand.start, cand._end, cand.text,add_comment))
						else
							if cand.comment:find("☯") then
								yield(Candidate("simp_rvlk", cand.start, cand._end, cand.text,add_comment .. cand.comment))
								-- yield(Candidate("simp_rvlk", cand.start, cand._end, cand.text,add_comment .. cand.comment:gsub("☯","")))   -- 去除精准造词太极图标
							else
								if utf8.len(cand.text) == 1 and code_comment and not hide_pinyin then
									yield(Candidate("simp_rvlk", cand.start, cand._end, cand.text,xform(code_comment:gsub('%[(.-),(.-),(.-)%]', '[%1'..' · '..'%2'..' · '..'%3]'))))
								else
									yield(Candidate("simp_rvlk", cand.start, cand._end, cand.text,add_comment:gsub("〕"," · ") .. cand.comment .. " 〕"))
								end
							end
						end
					end
				else
					local add_comment = ''
					local code_comment=env.code_rvdb:lookup(cand.text)
					if cand.type == 'punct' then
						add_comment = xform(code_comment:gsub('%[(.-),(.-),(.-)%]', '[%1'..' · '..'%2'..' · '..'%3]')).."+"
					elseif cand.type ~= 'sentence' then
						add_comment = get_tricomment(cand, env)
					end
					if add_comment ~= '' then
						if cand.type ~= 'completion' and (
								(env.name_space == 'new' and env.is_mixtyping) or
								(env.name_space == 'new_for_rvlk')
								) then
							cand.comment = add_comment
						else
							if cand.comment=="" then cand.comment = add_comment .. cand.comment end
						end
					end
					yield(cand)
				end
			end
		end
	else
		if script_text:find("^z") then
			for cand in input:iter() do
				local add_comment=get_tricomment(cand, env)
				local code_comment=env.code_rvdb:lookup(cand.text)
				if cand.comment=="" then
					if add_comment~=nil or add_comment~="" then
						cand.comment = add_comment
					end
				else
					if add_comment~=nil or add_comment~="" then
						if utf8.len(cand.text) == 1 and code_comment and not hide_pinyin then
							cand.comment = xform(code_comment:gsub('%[(.-),(.-),(.-)%]', '[%1'..' · '..'%2'..' · '..'%3]'))
						elseif utf8.len(cand.text) == 1 and code_comment and hide_pinyin then
							cand.comment = xform(code_comment:gsub('%[(.-),(.-),(.-)%]', '[%1'..' · '..'%2]'))
						else
							cand.comment = add_comment:gsub("〕"," · ") .. cand.comment .. " 〕"
						end
					end
				end
				yield(cand)
			end
		else
			for cand in input:iter() do
				-- if cand.comment:find("☯") then cand.comment="" end --  去除精准造词太极图标
				yield(cand)
			end
		end
	end
end

local function init(env)
	local config = env.engine.schema.config
	local spll_rvdb = config:get_string('lua_reverse_db/spelling')
	local code_rvdb = config:get_string('lua_reverse_db/code')
	local abc_extags_size = config:get_list_size('abc_segmentor/extra_tags')
	env.spll_rvdb = ReverseDb('build/' .. spll_rvdb .. '.reverse.bin')
	env.code_rvdb = ReverseDb('build/' .. code_rvdb .. '.reverse.bin')
	env.is_mixtyping = abc_extags_size > 0
end

return { init = init, func = filter }



