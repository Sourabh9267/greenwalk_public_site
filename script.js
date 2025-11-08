// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE MANAGEMENT ---
    const state = {
        currentStep: 1,
        calculationPeriod: 'monthly',
        country: 'IN',
        sections: { household: true, transport: true, flights: false, lifestyle: true },
        visibleSteps: ['setup', 'calculation', 'results']
    };
    
    // --- UI ELEMENT CACHE ---
    const ui = {
        stepper: document.getElementById('stepper'),
        stepContents: document.querySelectorAll('.step-content'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        periodCards: document.querySelectorAll('.period-card'),
        categoryCards: document.querySelectorAll('.category-card'),
        countrySelect: document.getElementById('country'),
        saveBtn: document.getElementById('saveImpactBtn'),
        dashboardBtn: document.getElementById('dashboard-btn'),
        calcFormsContainer: document.querySelector('.calculation-forms-container'),
        roleSelector: document.getElementById('role-selector'),
        roleDutiesDisplay: document.getElementById('role-duties-display'),
        // Added for Navbar
        navMenu: document.getElementById('nav-menu'),
        navToggle: document.getElementById('nav-toggle'),
        navClose: document.getElementById('nav-close'),
        navLinks: document.querySelectorAll('.nav__link')
    };

    // --- TEMPLATES for dynamic form generation ---
    const calculationTemplates = {
        household: `
            <div class="form-group calculation-section" data-section="household">
                <h5><i class="fas fa-home me-2"></i>Household</h5>
                <div class="mb-3">
                    <label class="form-label descriptive-label" for="electricity">How much electricity did your household consume <span class="period-in-label">(monthly)</span>?</label>
                    <input type="number" class="form-control" id="electricity" min="0" placeholder="0">
                    <small class="text-muted">Enter in kWh (also called "units" on your bill).</small>
                </div>
                <div class="mb-3">
                    <label class="form-label descriptive-label" for="lpg">How much cooking gas (LPG) did you use <span class="period-in-label">(monthly)</span>?</label>
                    <input type="number" class="form-control" id="lpg" min="0" placeholder="0">
                    <small class="text-muted">Enter in Litres. A domestic 14.2kg cylinder is ~28 L; a commercial 19kg is ~37 L.</small>
                </div>
            </div>`,
        transport: `
            <div class="form-group calculation-section" data-section="transport">
                <h5><i class="fas fa-car me-2"></i>Transport</h5>
                <div class="row">
                    <div class="col-md-7 mb-3">
                        <label class="form-label descriptive-label" for="carDistance">How far did you travel by car <span class="period-in-label">(monthly)</span>?</label>
                        <div class="input-group"><input type="number" class="form-control" id="carDistance" min="0" placeholder="0"><span class="input-group-text distance-unit">km</span></div>
                    </div>
                    <div class="col-md-5 mb-3"><label class="form-label">Fuel Type</label><select class="form-select" id="carFuel"><option value="petrol" selected>Petrol</option><option value="diesel">Diesel</option><option value="electric">Electric</option></select></div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3"><label class="form-label descriptive-label" for="busDistance">How far by bus <span class="period-in-label">(monthly)</span>?</label><div class="input-group"><input type="number" class="form-control" id="busDistance" min="0" placeholder="0"><span class="input-group-text distance-unit">km</span></div></div>
                    <div class="col-md-6 mb-3"><label class="form-label descriptive-label" for="trainDistance">How far by train/metro <span class="period-in-label">(monthly)</span>?</label><div class="input-group"><input type="number" class="form-control" id="trainDistance" min="0" placeholder="0"><span class="input-group-text distance-unit">km</span></div></div>
                </div>
            </div>`,
        flights: `
            <div class="form-group calculation-section" data-section="flights">
                <h5><i class="fas fa-plane me-2"></i>Flights</h5>
                <div class="mb-3"><label class="form-label descriptive-label" for="flights">How many return (round-trip) flights did you take <span class="period-in-label">(monthly)</span>?</label><input type="number" class="form-control" id="flights" min="0" placeholder="0"><small class="text-muted">We'll assume an average short-haul flight for calculation.</small></div>
            </div>`,
        lifestyle: `
            <div class="form-group calculation-section" data-section="lifestyle">
                <h5><i class="fas fa-shopping-basket me-2"></i>Lifestyle</h5>
                <div class="mb-3"><label class="form-label">What is your primary diet?</label><select class="form-select" id="dietType"><option value="heavy_meat">High Meat (Daily)</option><option value="medium_meat" selected>Medium Meat (3-5x week)</option><option value="low_meat">Low Meat (1-2x week)</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option></select></div>
                <div class="mb-3">
                    <label class="form-label descriptive-label" for="spending">How much did you spend on non-essential goods and entertainment <span class="period-in-label">(monthly)</span>?</label>
                    <div class="input-group"><span class="input-group-text currency-unit">₹</span><input type="number" class="form-control" id="spending" min="0" placeholder="0"></div>
                    <small class="text-muted">e.g., clothing, electronics, recreation, etc.</small>
                </div>
            </div>`
    };

    // --- CORE FUNCTIONS ---
    function getInputValue(id) { const el = document.getElementById(id); if (!el) return 0; if (el.tagName === 'SELECT') return el.value; return parseFloat(el.value) || 0; }

    function updateStepper() {
        const steps = [{ id: 'setup', label: 'Setup' }];
        if (Object.values(state.sections).some(v => v)) steps.push({ id: 'calculation', label: 'Calculation' });
        steps.push({ id: 'results', label: 'Results' });
        state.visibleSteps = steps.map(s => s.id);
        
        ui.stepper.innerHTML = steps.map((step, index) => {
            const stepNum = index + 1, isActive = stepNum === state.currentStep, isCompleted = stepNum < state.currentStep, line = index < steps.length - 1 ? '<div class="step-line-container"></div>' : '';
            return `<div class="step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" data-step-index="${stepNum}">
                        <div class="step-circle">${isCompleted ? '<i class="fas fa-check"></i>' : stepNum}</div>
                        <div class="step-label">${step.label}</div>
                    </div>` + line;
        }).join('').replace(/<div class="step-line-container"><\/div>$/, '');
    }

    function showStep(stepIndex) {
        if (stepIndex < 1 || stepIndex > state.visibleSteps.length) return;
        state.currentStep = stepIndex;
        
        const currentStepId = state.visibleSteps[stepIndex - 1];
        ui.stepContents.forEach(content => content.classList.remove('active'));
        document.querySelector(`.step-content[data-step-id="${currentStepId}"]`).classList.add('active');

        updateStepper();
        
        ui.prevBtn.disabled = stepIndex === 1;
        ui.nextBtn.style.display = (stepIndex === state.visibleSteps.length) ? 'none' : 'block';
        ui.nextBtn.innerHTML = (stepIndex === state.visibleSteps.length - 1) ? 'Calculate <i class="fas fa-calculator ms-2"></i>' : 'Next <i class="fas fa-arrow-right ms-2"></i>';
    }

    function updateDynamicContent() {
        state.calculationPeriod = document.querySelector('.period-card.selected').dataset.period;
        state.country = ui.countrySelect.value;
        const factors = emissionFactors[state.country];
        const periodText = `(${state.calculationPeriod.replace('ly', '')})`;

        ui.calcFormsContainer.innerHTML = Object.keys(calculationTemplates).filter(key => state.sections[key]).map(key => calculationTemplates[key]).join('');

        document.querySelectorAll('.period-text').forEach(el => el.textContent = state.calculationPeriod);
        document.querySelectorAll('.period-text-bold').forEach(el => el.textContent = state.calculationPeriod.charAt(0).toUpperCase() + state.calculationPeriod.slice(1));
        document.querySelectorAll('.period-in-label').forEach(el => el.textContent = periodText);
        document.querySelectorAll('.distance-unit').forEach(el => el.textContent = factors.distanceUnit);
        document.querySelectorAll('.currency-unit').forEach(el => el.textContent = factors.currency);
    }

    function calculateFootprint() {
        const period = state.calculationPeriod, factors = emissionFactors[state.country], hhSize = getInputValue('householdSize') || 1;
        const periodDays = { daily: 1, weekly: 7, monthly: 30.42 }[period];
        const calculationDetails = {};
        const results = { household: 0, transport: 0, flights: 0, lifestyle: 0 };
        const unit = factors.distanceUnit;

        if (state.sections.household) {
            const electricity = getInputValue('electricity'), lpg = getInputValue('lpg');
            results.household = (electricity * factors.electricity_grid_intensity) + (lpg * factors.lpg_litre);
            calculationDetails.household = { formula: `<b>Electricity:</b><br>${electricity.toFixed(2)} kWh &times; ${factors.electricity_grid_intensity} kg/kWh<br><b>LPG:</b><br>${lpg.toFixed(2)} L &times; ${factors.lpg_litre} kg/L`};
        }
        if (state.sections.transport) {
            const carFuel = getInputValue('carFuel'), carDist = getInputValue('carDistance'), busDist = getInputValue('busDistance'), trainDist = getInputValue('trainDistance');
            const carFactorKey = `car_${carFuel}_${unit}`, electricKey = `car_electric_kwh_${unit}`;
            const carFactor = carFuel === 'electric' ? (factors[electricKey] * factors.electricity_grid_intensity) : factors[carFactorKey];
            results.transport = (carDist * carFactor) + (busDist * factors[`pt_bus_${unit}`]) + (trainDist * factors[`pt_train_local_${unit}`]);
            calculationDetails.transport = { formula: `<b>Car:</b><br>${carDist.toFixed(2)} ${unit} &times; ${carFactor.toFixed(2)} kg/${unit}<br><b>Bus:</b><br>${busDist.toFixed(2)} ${unit} &times; ${factors[`pt_bus_${unit}`]} kg/${unit}<br>...and other transport`};
        }
        if (state.sections.flights) {
            const flightCount = getInputValue('flights');
            results.flights = flightCount * 90 * 2.5; // Avg 2.5hr flight
            calculationDetails.flights = { formula: `${flightCount} flights &times; ~225 kg/flight (avg.)` };
        }
        if (state.sections.lifestyle) {
            const dietType = getInputValue('dietType');
            const dailyDietFactor = (factors.secondary_factors['food_' + dietType]); // Assuming it's a daily kg factor
            const spending = getInputValue('spending');
            const spendingFactor = (factors.secondary_factors.clothing);
            results.lifestyle = (dailyDietFactor * periodDays) + (spending * spendingFactor);
            calculationDetails.lifestyle = { formula: `<b>Diet:</b><br>${periodDays.toFixed(1)} days &times; ${dailyDietFactor.toFixed(2)} kg/day<br><b>Spending:</b><br>${spending.toFixed(2)} ${factors.currency} &times; ${spendingFactor.toFixed(3)} (factor)` };
        }
        
        if(hhSize > 1) {
             results.household /= hhSize;
             calculationDetails.household.formula = `(${calculationDetails.household.formula}) / ${hhSize} people`;
        }

        results.total = Object.values(results).reduce((sum, val) => sum + val, 0);
        return { results, calculationDetails };
    }

    function displayResults({ results, calculationDetails }) {
        document.getElementById('totalEmissions').textContent = results.total.toFixed(2);
        const annualTonnes = (results.total / {daily:1, weekly:7, monthly:30.42}[state.calculationPeriod] * 365) / 1000;
        document.getElementById('annualEquivalent').textContent = `Equivalent to ~${annualTonnes.toFixed(2)} tonnes per year`;

        const breakdownContainer = document.getElementById('breakdownList');
        breakdownContainer.innerHTML = '';
        
        const sortedResults = Object.entries(results).filter(([k, v]) => k !== 'total' && v > 0.01).sort((a,b) => b[1] - a[1]);
        if (!sortedResults.length) { breakdownContainer.innerHTML = `<p class="text-muted text-center p-3">No significant emissions were calculated.</p>`; return; }
        
        const iconMap = { household: 'fa-home', transport: 'fa-car', flights: 'fa-plane', lifestyle: 'fa-shopping-basket' };

        sortedResults.forEach(([key, value]) => {
            const card = document.createElement('div'); card.className = 'breakdown-card';
            const detail = calculationDetails[key];
            const title = key.charAt(0).toUpperCase() + key.slice(1);
            card.innerHTML = `<div class="breakdown-card-header">
                                  <span><i class="fas ${iconMap[key]} me-2"></i>${title}</span>
                                  <i class="fas fa-info-circle info-icon" data-bs-toggle="tooltip" data-bs-html="true" title="${detail ? detail.formula : 'No details'}"></i>
                              </div>
                              <div><div class="breakdown-card-value">${value.toFixed(2)} kg</div>
                              <div class="breakdown-card-percent">${(results.total > 0 ? (value / results.total * 100) : 0).toFixed(0)}% of total</div></div>`;
            breakdownContainer.appendChild(card);
        });
        
        new bootstrap.Tooltip(document.body, { selector: "[data-bs-toggle='tooltip']" });
    }
    
    // --- Roles and Duties ---
    function initRolesSection() {
        if (typeof roleDuties === 'undefined' || !ui.roleSelector) return;
        Object.keys(roleDuties).forEach(key => ui.roleSelector.add(new Option(roleDuties[key].title, key)));
        ui.roleSelector.addEventListener('change', () => {
            const category = roleDuties[ui.roleSelector.value];
            if (!category) return;
            let html = '<div class="accordion" id="rolesAccordion">';
            Object.keys(category.roles).forEach((roleKey, index) => {
                const role = category.roles[roleKey];
                html += `
                    <div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#c-${index}">${role.title}</button></h2>
                    <div id="c-${index}" class="accordion-collapse collapse" data-bs-parent="#rolesAccordion"><div class="accordion-body">
                    <ul>${role.duties.map(d => `<li><i class="fas fa-check-circle"></i>${d}</li>`).join('')}</ul></div></div></div>`;
            });
            ui.roleDutiesDisplay.innerHTML = html + '</div>';
        });
    }
    
    // --- EVENT BINDING & INIT ---
    function setupEventListeners() {
        // --- Navbar Toggle Functionality ---
        if (ui.navToggle) {
            ui.navToggle.addEventListener('click', () => {
                ui.navMenu.classList.add('show-menu');
            });
        }
        if (ui.navClose) {
            ui.navClose.addEventListener('click', () => {
                ui.navMenu.classList.remove('show-menu');
            });
        }
        // Close menu when a link is clicked
        ui.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                ui.navMenu.classList.remove('show-menu');
            });
        });

        // --- Original Event Listeners ---
        ui.periodCards.forEach(card => card.addEventListener('click', () => { ui.periodCards.forEach(c => c.classList.remove('selected')); card.classList.add('selected'); updateDynamicContent(); }));
        ui.categoryCards.forEach(card => card.addEventListener('click', () => { const cb = card.querySelector('input'); cb.checked = !cb.checked; state.sections[cb.dataset.section] = cb.checked; card.classList.toggle('selected', cb.checked); updateStepper(); showStep(state.currentStep); }));
        ui.countrySelect.addEventListener('change', updateDynamicContent);
        ui.prevBtn.addEventListener('click', () => showStep(state.currentStep - 1));
        ui.nextBtn.addEventListener('click', () => { if (state.currentStep === state.visibleSteps.length - 1) displayResults(calculateFootprint()); showStep(state.currentStep + 1); });
        
        ui.dashboardBtn.addEventListener('click', () => window.location.href = 'dashboard.html');
        ui.saveBtn.addEventListener('click', () => {
            const { results } = calculateFootprint();
            localStorage.setItem('greenwalk_pending_calculation', JSON.stringify({ ...results, period: state.calculationPeriod, ts: new Date().toISOString() }));
            Swal.fire({
                title: 'Save Your Impact',
                html: `To save your result of <strong>${results.total.toFixed(2)} kg CO₂e</strong>, please create an account. This will allow you to:
                       <ul class="swal-features list-unstyled text-start" >
                           <li><i class="fas fa-check-circle me-2"></i>Track your progress over time</li>
                           <li><i class="fas fa-check-circle me-2"></i>Receive personalized, AI-based suggestions</li>
                           <li><i class="fas fa-check-circle me-2"></i>Compare your footprint with community averages</li>
                       </ul>`,
                icon: 'info', showCancelButton: true,
                confirmButtonText: '<i class="fas fa-user-plus me-2"></i>Sign Up',
                cancelButtonText: '<i class="fas fa-sign-in-alt me-2"></i>Log In',
                confirmButtonColor: '#2a8a32ff', cancelButtonColor: '#3281dbff'
            }).then(result => {
                if (result.isConfirmed || result.dismiss === Swal.DismissReason.cancel) {
                    Swal.fire('Coming Soon!', 'User accounts and dashboards are part of Phase 2. Your result is saved in this browser for now.', 'info');
                }
            });
        });
    }
    
    initRolesSection(); updateStepper(); showStep(1); updateDynamicContent(); setupEventListeners();
});