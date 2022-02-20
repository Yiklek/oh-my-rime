local function commit_text_processor(key, env)
	local engine = env.engine
	local context = engine.context
	local composition = context.composition
	local segment = composition:back()
	local input_text = context.input
	local candidate_count =0

	if input_text:find("^%p*(%a+%d*)$") then
		if context:has_menu() then
			candidate_count = segment.menu:candidate_count()
		end
		env.last_1th_text=context:get_commit_text() or ""
		env.last_2th_text={text="",type=""}
		env.last_3th_text={text="",type=""}
		if candidate_count>1 then
			env.last_2th_text=segment:get_candidate_at(1)
			if candidate_count>2 then
				env.last_3th_text=segment:get_candidate_at(2)
			end
		end
	end
	if key.keycode==0x27 and context:is_composing() and env.last_3th_text.text~="" then
		if env.last_3th_text.type=="reverse_lookup" or env.last_3th_text.type=="table" then
			context:clear()
			engine:commit_text(env.last_3th_text.text)
			return 1
		end
	end
	local m,n=input_text:find("^(%a+%d*)([%[%/%]\\])")
	if n~=nil and m~=nil then
		if (context:is_composing()) then
			-- local focus_text = context:get_commit_text()
			-- engine:commit_text(focus_text)
			context:clear()
			if input_text:find("^%u+%l*%d*") then   -- 大写字母引导的日期反查与转换功能，[ 和 ] 分别对应二选三选
				if input_text:find("%[") then
					engine:commit_text(env.last_2th_text.text)
				elseif input_text:find("%]") then
					engine:commit_text(env.last_3th_text.text)
				end
			else
				engine:commit_text(env.last_1th_text..CandidateText[1])  -- 第1个候选标点符号
			end
			return 1
		end
	end
	return 2
end

return commit_text_processor